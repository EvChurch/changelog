import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get("role")
  const teamId = searchParams.get("teamId")
  const since = searchParams.get("since")
  const before = searchParams.get("before")
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100)

  const canViewTeam = async (id: string) => {
    const [leader, assignment] = await Promise.all([
      prisma.leader.findUnique({
        where: {
          personId_teamId: {
            personId: person.id,
            teamId: id,
          },
        },
      }),
      prisma.assignment.findFirst({
        where: {
          personId: person.id,
          position: { teamId: id },
        },
      }),
    ])
    return Boolean(leader || assignment)
  }

  if (role === "driver") {
    const driverServiceTypes = await prisma.driver.findMany({
      where: { personId: person.id },
      select: { serviceTypeId: true },
    })
    const serviceTypeIds = driverServiceTypes.map(
      (driver) => driver.serviceTypeId
    )
    if (serviceTypeIds.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const list = await prisma.feedback.findMany({
      where: {
        status: "pending_driver_review",
        team: { serviceTypeId: { in: serviceTypeIds } },
      },
      include: {
        team: { select: { name: true } },
        createdBy: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return NextResponse.json(list)
  }

  if (role === "leader") {
    const leaderTeams = await prisma.leader.findMany({
      where: { personId: person.id },
      select: { teamId: true },
    })
    const teamIds = leaderTeams.map((l) => l.teamId)
    if (teamIds.length === 0) {
      return NextResponse.json([])
    }
    const list = await prisma.feedback.findMany({
      where: {
        teamId: { in: teamIds },
        status: "pending_leader_review",
      },
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return NextResponse.json(list)
  }

  if (role === "team_leader") {
    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 })
    }
    const isLeader = await prisma.leader.findUnique({
      where: {
        personId_teamId: {
          personId: person.id,
          teamId,
        },
      },
    })
    if (!isLeader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const list = await prisma.feedback.findMany({
      where: { teamId },
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return NextResponse.json(list)
  }

  if (teamId != null || since != null || before != null) {
    if (teamId && !(await canViewTeam(teamId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const where: {
      status: "accepted"
      teamId?: string
      acceptedAt?: { gte?: Date; lte?: Date }
    } = {
      status: "accepted",
    }
    if (teamId) where.teamId = teamId
    const sinceDate = since ? new Date(since) : null
    const beforeDate = before ? new Date(before) : null
    if (sinceDate || beforeDate) {
      where.acceptedAt = {}
      if (sinceDate) where.acceptedAt.gte = sinceDate
      if (beforeDate) where.acceptedAt.lte = beforeDate
    }
    const list = await prisma.feedback.findMany({
      where,
      include: {
        team: { select: { id: true, name: true } },
        createdBy: { select: { fullName: true, email: true } },
      },
      orderBy: { acceptedAt: "desc" },
      take: limit,
    })
    return NextResponse.json(list)
  }

  return NextResponse.json(
    { error: "Missing role or teamId/since" },
    { status: 400 }
  )
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  let body: { content: string; teamId: string; asDriver?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { content, teamId: pcoTeamIdOrOurId, asDriver } = body
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content required" }, { status: 400 })
  }
  if (!pcoTeamIdOrOurId || typeof pcoTeamIdOrOurId !== "string") {
    return NextResponse.json({ error: "teamId required" }, { status: 400 })
  }

  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const team = await prisma.team.findUnique({
    where: { id: pcoTeamIdOrOurId },
    select: { id: true, serviceTypeId: true },
  })
  if (!team) {
    return NextResponse.json(
      { error: "Team not found; use /api/teams to get valid team ids" },
      { status: 400 }
    )
  }

  const isDriverForTeamServiceType =
    Boolean(team.serviceTypeId) &&
    (await prisma.driver.findFirst({
      where: {
        personId: person.id,
        serviceTypeId: team.serviceTypeId ?? undefined,
      },
    }))

  const status =
    asDriver && isDriverForTeamServiceType
      ? ("pending_leader_review" as const)
      : ("pending_driver_review" as const)
  const source =
    asDriver && isDriverForTeamServiceType
      ? ("driver" as const)
      : ("member" as const)

  const feedback = await prisma.feedback.create({
    data: {
      teamId: team.id,
      personId: person.id,
      content: content.trim(),
      status,
      source,
    },
  })
  return NextResponse.json(feedback)
}
