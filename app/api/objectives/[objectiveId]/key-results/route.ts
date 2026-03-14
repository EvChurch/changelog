import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { memberOrDriverWrite } from "@/lib/permissions"
import { getOrCreatePersonByPcoId } from "@/lib/person"

async function getObjectiveTeamId(objectiveId: string) {
  const objective = await prisma.objective.findUnique({
    where: { id: objectiveId },
    select: { id: true, position: { select: { teamId: true } } },
  })
  return objective
}

export async function POST(
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

  const objective = await getObjectiveTeamId(objectiveId)
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
    progress?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!body.title || body.title.trim().length === 0) {
    return NextResponse.json({ error: "title required" }, { status: 400 })
  }

  const keyResult = await prisma.keyResult.create({
    data: {
      objectiveId,
      title: body.title.trim(),
      descriptionMarkdown: body.descriptionMarkdown ?? null,
      progress:
        typeof body.progress === "number"
          ? Math.max(0, Math.min(100, body.progress))
          : 0,
    },
  })
  return NextResponse.json(keyResult, { status: 201 })
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

  const objective = await getObjectiveTeamId(objectiveId)
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
    keyResultId?: string
    title?: string
    descriptionMarkdown?: string | null
    progress?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!body.keyResultId) {
    return NextResponse.json({ error: "keyResultId required" }, { status: 400 })
  }

  const keyResult = await prisma.keyResult.findUnique({
    where: { id: body.keyResultId },
    select: { id: true, objectiveId: true },
  })
  if (!keyResult || keyResult.objectiveId !== objectiveId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await prisma.keyResult.update({
    where: { id: body.keyResultId },
    data: {
      title: body.title?.trim(),
      descriptionMarkdown:
        body.descriptionMarkdown === undefined
          ? undefined
          : (body.descriptionMarkdown ?? null),
      progress:
        typeof body.progress === "number"
          ? Math.max(0, Math.min(100, body.progress))
          : undefined,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
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

  const objective = await getObjectiveTeamId(objectiveId)
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

  let body: { keyResultId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!body.keyResultId) {
    return NextResponse.json({ error: "keyResultId required" }, { status: 400 })
  }

  const keyResult = await prisma.keyResult.findUnique({
    where: { id: body.keyResultId },
    select: { id: true, objectiveId: true },
  })
  if (!keyResult || keyResult.objectiveId !== objectiveId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.keyResult.delete({ where: { id: body.keyResultId } })
  return NextResponse.json({ ok: true })
}
