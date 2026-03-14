import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  canViewTeam,
  isEligibleDriverForTeam,
  isPersonInTeam,
  memberOrDriverWrite,
} from "@/lib/permissions"
import { getOrCreatePersonByPcoId } from "@/lib/person"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ positionId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { positionId } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: { id: true, teamId: true, name: true },
  })
  if (!position) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const [canView, canDriverView] = await Promise.all([
    canViewTeam(person.id, position.teamId),
    isEligibleDriverForTeam(person.id, position.teamId),
  ])
  if (!canView && !canDriverView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const objectives = await prisma.objective.findMany({
    where: { positionId: position.id },
    include: {
      assignee: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
      keyResults: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ position, objectives })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ positionId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { positionId } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: { id: true, teamId: true },
  })
  if (!position) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const canWrite = await memberOrDriverWrite(person.id, position.teamId)
  if (!canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: {
    title?: string
    descriptionMarkdown?: string | null
    status?: "not_started" | "in_progress" | "completed" | "on_hold"
    assigneePersonId?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.title || body.title.trim().length === 0) {
    return NextResponse.json({ error: "title required" }, { status: 400 })
  }

  if (body.assigneePersonId) {
    const assigneeInTeam = await isPersonInTeam(
      body.assigneePersonId,
      position.teamId
    )
    if (!assigneeInTeam) {
      return NextResponse.json(
        { error: "Assignee must be in this team" },
        { status: 400 }
      )
    }
  }

  const objective = await prisma.objective.create({
    data: {
      positionId: position.id,
      title: body.title.trim(),
      descriptionMarkdown: body.descriptionMarkdown ?? null,
      status: body.status ?? "not_started",
      createdByPersonId: person.id,
      assigneePersonId: body.assigneePersonId ?? null,
    },
    include: {
      assignee: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
      keyResults: true,
    },
  })

  return NextResponse.json(objective, { status: 201 })
}
