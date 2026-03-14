import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

import TeamMembersClient from "../team-members-client"

export default async function TeamMembersPage({
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

  const roster = {
    leaders: team.leaders
      .map((l) => ({
        id: l.person.id,
        fullName: l.person.fullName,
        email: l.person.email,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    positions: team.positions.map((position) => ({
      id: position.id,
      name: position.name?.trim() || "Team Member",
      members: position.assignments
        .map((a) => ({
          id: a.person.id,
          fullName: a.person.fullName,
          email: a.person.email,
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    })),
  }

  return <TeamMembersClient teamId={team.id} roster={roster} />
}
