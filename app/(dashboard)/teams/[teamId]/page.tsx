import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

import TeamDashboardClient from "./team-dashboard-client"

const DEFAULT_DAYS = 90

export default async function TeamDashboardPage({
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
      descriptionMarkdown: true,
      leaders: {
        include: {
          person: {
            select: { id: true, fullName: true, email: true },
          },
        },
      },
      positions: {
        include: {
          assignments: {
            include: {
              person: {
                select: { id: true, fullName: true, email: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  })

  if (!team) notFound()

  const isLeader = team.leaders.some((leader) => leader.personId === person.id)
  const isMember = team.positions.some((position) =>
    position.assignments.some((assignment) => assignment.personId === person.id)
  )
  const isEligibleDriver =
    Boolean(team.serviceTypeId) &&
    Boolean(
      await prisma.driver.findUnique({
        where: {
          personId_serviceTypeId: {
            personId: person.id,
            serviceTypeId: team.serviceTypeId ?? "",
          },
        },
      })
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
              acceptedAt: {
                gte: sinceDate,
              },
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

  const roster = {
    leaders: team.leaders
      .map((leader) => ({
        id: leader.person.id,
        fullName: leader.person.fullName,
        email: leader.person.email,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    positions: team.positions.map((position) => ({
      id: position.id,
      name: position.name?.trim() || "Team Member",
      descriptionMarkdown: position.descriptionMarkdown,
      members: position.assignments
        .map((assignment) => ({
          id: assignment.person.id,
          fullName: assignment.person.fullName,
          email: assignment.person.email,
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    })),
  }

  const dedupedFeedback = Array.from(
    new Map(initialFeedback.map((item) => [item.id, item])).values()
  ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return (
    <div className="min-h-screen">
      <header className="changelog-header">
        <div className="changelog-container flex h-14 items-center justify-between">
          <Link
            href="/dashboard"
            className="font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Changelog
          </Link>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {session.user.email}
          </span>
        </div>
      </header>
      <main className="changelog-container py-8">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to dashboard
        </Link>
        <h1 className="changelog-page-title mt-3">{team.name}</h1>
        <p className="changelog-page-subtitle">
          {isLeader
            ? "You are a leader for this team. You can review, edit, and manage visibility."
            : `Showing accepted feedback from the last ${DEFAULT_DAYS} days first, plus your pending submissions.`}
        </p>
        <TeamDashboardClient
          teamId={team.id}
          currentPersonId={person.id}
          isLeader={isLeader}
          defaultDays={DEFAULT_DAYS}
          canEditContent={isLeader || isEligibleDriver}
          canEditGoals={isLeader || isMember || isEligibleDriver}
          teamDescriptionMarkdown={team.descriptionMarkdown}
          roster={roster}
          initialFeedback={dedupedFeedback.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
            acceptedAt: item.acceptedAt?.toISOString() ?? null,
            reviewedByDriverAt: item.reviewedByDriverAt?.toISOString() ?? null,
          }))}
        />
      </main>
    </div>
  )
}
