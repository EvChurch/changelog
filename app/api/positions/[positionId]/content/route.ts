import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  canViewTeam,
  isEligibleDriverForTeam,
  leaderOrDriverWrite,
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
    select: { id: true, name: true, teamId: true, descriptionMarkdown: true },
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

  return NextResponse.json(position)
}

export async function PATCH(
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

  const canWrite = await leaderOrDriverWrite(person.id, position.teamId)
  if (!canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { descriptionMarkdown?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (
    body.descriptionMarkdown !== undefined &&
    body.descriptionMarkdown !== null &&
    typeof body.descriptionMarkdown !== "string"
  ) {
    return NextResponse.json(
      { error: "descriptionMarkdown must be a string or null" },
      { status: 400 }
    )
  }

  const updated = await prisma.position.update({
    where: { id: positionId },
    data: { descriptionMarkdown: body.descriptionMarkdown ?? null },
    select: { id: true, name: true, teamId: true, descriptionMarkdown: true },
  })

  return NextResponse.json(updated)
}
