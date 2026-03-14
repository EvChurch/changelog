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

async function loadContext(objectiveId: string) {
  return prisma.objective.findUnique({
    where: { id: objectiveId },
    include: {
      position: { select: { id: true, teamId: true, name: true } },
      assignee: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
      keyResults: { orderBy: { createdAt: "asc" } },
    },
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ objectiveId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { objectiveId } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })
  const objective = await loadContext(objectiveId)
  if (!objective) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const [canView, canDriverView] = await Promise.all([
    canViewTeam(person.id, objective.position.teamId),
    isEligibleDriverForTeam(person.id, objective.position.teamId),
  ])
  if (!canView && !canDriverView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(objective)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ objectiveId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { objectiveId } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const objective = await loadContext(objectiveId)
  if (!objective) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const canWrite = await memberOrDriverWrite(
    person.id,
    objective.position.teamId
  )
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

  if (body.assigneePersonId) {
    const assigneeInTeam = await isPersonInTeam(
      body.assigneePersonId,
      objective.position.teamId
    )
    if (!assigneeInTeam) {
      return NextResponse.json(
        { error: "Assignee must be in this team" },
        { status: 400 }
      )
    }
  }

  const updated = await prisma.objective.update({
    where: { id: objectiveId },
    data: {
      title: body.title?.trim(),
      descriptionMarkdown:
        body.descriptionMarkdown === undefined
          ? undefined
          : (body.descriptionMarkdown ?? null),
      status: body.status,
      assigneePersonId:
        body.assigneePersonId === undefined
          ? undefined
          : (body.assigneePersonId ?? null),
    },
    include: {
      assignee: { select: { id: true, fullName: true, email: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
      keyResults: { orderBy: { createdAt: "asc" } },
      position: { select: { id: true, teamId: true, name: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ objectiveId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { objectiveId } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const objective = await loadContext(objectiveId)
  if (!objective) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const canWrite = await memberOrDriverWrite(
    person.id,
    objective.position.teamId
  )
  if (!canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.objective.delete({ where: { id: objectiveId } })
  return NextResponse.json({ ok: true })
}
