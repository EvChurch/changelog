import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  canViewTeam,
  isEligibleDriverForTeam,
  isPersonInTeam,
} from "@/lib/permissions"
import { getOrCreatePersonByPcoId } from "@/lib/person"

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{ teamId: string; personId: string }>
  }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { teamId, personId } = await params
  const requester = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const [canView, canDriverView, memberInTeam] = await Promise.all([
    canViewTeam(requester.id, teamId),
    isEligibleDriverForTeam(requester.id, teamId),
    isPersonInTeam(personId, teamId),
  ])
  if (!canView && !canDriverView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!memberInTeam) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: {
      id: true,
      fullName: true,
      email: true,
      image: true,
      leaders: {
        where: { teamId },
        select: { id: true },
      },
      assignments: {
        where: { position: { teamId } },
        select: {
          position: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })
  if (!person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const [otherLeaderTeams, otherAssignedTeams] = await Promise.all([
    prisma.leader.findMany({
      where: { personId, teamId: { not: teamId } },
      select: { team: { select: { id: true, name: true } } },
    }),
    prisma.assignment.findMany({
      where: { personId, position: { teamId: { not: teamId } } },
      select: {
        position: { select: { team: { select: { id: true, name: true } } } },
      },
    }),
  ])

  const teamsMap = new Map<string, { id: string; name: string }>()
  for (const leaderTeam of otherLeaderTeams) {
    teamsMap.set(leaderTeam.team.id, leaderTeam.team)
  }
  for (const assignment of otherAssignedTeams) {
    const team = assignment.position.team
    teamsMap.set(team.id, team)
  }

  const teamRoles = {
    isLeader: person.leaders.length > 0,
    positions: Array.from(
      new Set(
        person.assignments
          .map((assignment) => assignment.position.name?.trim())
          .filter((name): name is string => Boolean(name))
      )
    ).sort((a, b) => a.localeCompare(b)),
  }

  return NextResponse.json({
    person: {
      id: person.id,
      fullName: person.fullName,
      email: person.email,
      image: person.image,
    },
    teamRoles,
    otherTeams: Array.from(teamsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
  })
}
