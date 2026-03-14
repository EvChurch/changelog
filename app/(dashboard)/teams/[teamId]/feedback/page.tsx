import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

import TeamFeedbackClient from "../team-feedback-client"

const DEFAULT_DAYS = 90

export default async function TeamFeedbackPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { teamId } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      serviceTypeId: true,
      leaders: { select: { personId: true } },
      positions: {
        select: { assignments: { select: { personId: true } } },
      },
    },
  })

  if (!team) notFound()

  const isLeader = team.leaders.some((l) => l.personId === person.id)
  const isMember = team.positions.some((position) =>
    position.assignments.some((a) => a.personId === person.id)
  )
  const isEligibleDriver = Boolean(
    team.serviceTypeId &&
    (await prisma.driver.findUnique({
      where: {
        personId_serviceTypeId: {
          personId: person.id,
          serviceTypeId: team.serviceTypeId ?? "",
        },
      },
    }))
  )

  if (!isLeader && !isMember && !isEligibleDriver) notFound()

  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - DEFAULT_DAYS)

  const initialFeedback = isLeader
    ? await prisma.feedback.findMany({
        where: { teamId: team.id },
        include: {
          team: { select: { id: true, name: true } },
          createdBy: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : (
        await Promise.all([
          prisma.feedback.findMany({
            where: {
              teamId: team.id,
              status: "accepted",
              acceptedAt: { gte: sinceDate },
            },
            include: {
              team: { select: { id: true, name: true } },
              createdBy: { select: { fullName: true, email: true } },
            },
            orderBy: { acceptedAt: "desc" },
            take: 50,
          }),
          prisma.feedback.findMany({
            where: {
              teamId: team.id,
              personId: person.id,
              status: {
                in: ["pending_driver_review", "pending_leader_review"],
              },
            },
            include: {
              team: { select: { id: true, name: true } },
              createdBy: { select: { fullName: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          }),
        ])
      ).flat()

  const deduped = Array.from(
    new Map(initialFeedback.map((item) => [item.id, item])).values()
  ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return (
    <TeamFeedbackClient
      teamId={team.id}
      isLeader={isLeader}
      defaultDays={DEFAULT_DAYS}
      initialFeedback={deduped.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        acceptedAt: item.acceptedAt?.toISOString() ?? null,
        reviewedByDriverAt: item.reviewedByDriverAt?.toISOString() ?? null,
      }))}
    />
  )
}
