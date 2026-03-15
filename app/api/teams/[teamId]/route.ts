import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { memberOrDriverWrite } from "@/lib/permissions"
import { getOrCreatePersonByPcoId } from "@/lib/person"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { teamId } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const canAccess = await memberOrDriverWrite(person.id, teamId)
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      positions: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
  })

  if (!team) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: team.id,
    name: team.name,
    positions: team.positions.map((p) => ({
      id: p.id,
      name: p.name?.trim() || "Team Member",
    })),
  })
}
