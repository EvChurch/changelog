import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreateUserByPcoId } from "@/lib/user"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  let body: {
    action: "driver_approve" | "driver_reject" | "leader_accept"
    comment?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { action, comment } = body

  const user = await getOrCreateUserByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    name: session.user.name ?? undefined,
  })

  const feedback = await prisma.feedback.findUnique({ where: { id } })
  if (!feedback) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (action === "driver_approve" || action === "driver_reject") {
    const isDriver = await prisma.driver.findUnique({
      where: { userId: user.id },
    })
    if (!isDriver) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (feedback.status !== "pending_driver_review") {
      return NextResponse.json(
        { error: "Feedback is not pending driver review" },
        { status: 400 }
      )
    }
    if (action === "driver_approve") {
      await prisma.feedback.update({
        where: { id },
        data: {
          status: "pending_leader_review",
          driverComment: comment ?? null,
          reviewedByDriverAt: new Date(),
        },
      })
    } else {
      await prisma.feedback.update({
        where: { id },
        data: {
          driverComment: comment ?? null,
          reviewedByDriverAt: new Date(),
          status: "pending_driver_review",
        },
      })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === "leader_accept") {
    const leader = await prisma.leader.findUnique({
      where: { userId_teamId: { userId: user.id, teamId: feedback.teamId } },
    })
    if (!leader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (feedback.status !== "pending_leader_review") {
      return NextResponse.json(
        { error: "Feedback is not pending leader review" },
        { status: 400 }
      )
    }
    await prisma.feedback.update({
      where: { id },
      data: {
        status: "accepted",
        leaderComment: comment ?? null,
        acceptedAt: new Date(),
      },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const user = await getOrCreateUserByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    name: session.user.name ?? undefined,
  })

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      team: true,
      createdBy: { select: { name: true, email: true } },
    },
  })
  if (!feedback) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const isDriver = await prisma.driver.findUnique({
    where: { userId: user.id },
  })
  const isLeader = await prisma.leader.findUnique({
    where: { userId_teamId: { userId: user.id, teamId: feedback.teamId } },
  })
  const canView =
    isDriver ||
    isLeader ||
    feedback.createdById === user.id ||
    feedback.status === "accepted"

  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json(feedback)
}
