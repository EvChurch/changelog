import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

import PositionGoalsClient from "../position-goals-client"

export default async function PositionGoalsPage({
  params,
}: {
  params: Promise<{ teamId: string; positionId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { teamId, positionId } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const position = await prisma.position.findUnique({
    where: { id: positionId, teamId },
    select: {
      id: true,
      team: {
        select: {
          id: true,
          serviceTypeId: true,
          leaders: { select: { personId: true } },
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
          },
        },
      },
    },
  })

  if (!position) notFound()

  const team = position.team
  const isLeader = team.leaders.some((l) => l.personId === person.id)
  const isMember = team.positions.some((p) =>
    p.assignments.some((a) => a.personId === person.id)
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

  const canEditGoals = isLeader || isMember || isEligibleDriver

  const teamMembersMap = new Map<
    string,
    { id: string; fullName: string; email: string | null }
  >()
  for (const pos of team.positions) {
    for (const a of pos.assignments) {
      teamMembersMap.set(a.person.id, {
        id: a.person.id,
        fullName: a.person.fullName,
        email: a.person.email,
      })
    }
  }
  const leaders = await prisma.leader.findMany({
    where: { teamId: team.id },
    include: {
      person: {
        select: { id: true, fullName: true, email: true },
      },
    },
  })
  for (const l of leaders) {
    teamMembersMap.set(l.person.id, {
      id: l.person.id,
      fullName: l.person.fullName,
      email: l.person.email,
    })
  }
  const teamMembers = Array.from(teamMembersMap.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  )

  return (
    <PositionGoalsClient
      positionId={position.id}
      canEditGoals={canEditGoals}
      teamMembers={teamMembers}
    />
  )
}
