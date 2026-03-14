import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

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
    action:
      | "driver_approve"
      | "driver_reject"
      | "leader_accept"
      | "leader_reject"
      | "leader_edit"
    comment?: string
    content?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { action, comment } = body

  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: { team: { select: { serviceTypeId: true } } },
  })
  if (!feedback) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (action === "driver_approve" || action === "driver_reject") {
    const isDriver =
      Boolean(feedback.team.serviceTypeId) &&
      (await prisma.driver.findFirst({
        where: {
          personId: person.id,
          serviceTypeId: feedback.team.serviceTypeId ?? undefined,
        },
      }))
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

  if (
    action === "leader_accept" ||
    action === "leader_reject" ||
    action === "leader_edit"
  ) {
    const leader = await prisma.leader.findUnique({
      where: {
        personId_teamId: { personId: person.id, teamId: feedback.teamId },
      },
    })
    if (!leader) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (action === "leader_edit") {
      if (
        typeof body.content !== "string" ||
        body.content.trim().length === 0
      ) {
        return NextResponse.json({ error: "content required" }, { status: 400 })
      }
      await prisma.feedback.update({
        where: { id },
        data: {
          content: body.content.trim(),
          leaderComment: comment ?? null,
        },
      })
      return NextResponse.json({ ok: true })
    }

    if (feedback.status !== "pending_leader_review") {
      return NextResponse.json(
        { error: "Feedback is not pending leader review" },
        { status: 400 }
      )
    }

    if (action === "leader_accept") {
      await prisma.feedback.update({
        where: { id },
        data: {
          status: "accepted",
          leaderComment: comment ?? null,
          acceptedAt: new Date(),
        },
      })
    } else {
      await prisma.feedback.update({
        where: { id },
        data: {
          status: "pending_driver_review",
          leaderComment: comment ?? null,
          acceptedAt: null,
        },
      })
    }

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
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      team: true,
      createdBy: { select: { fullName: true, email: true } },
    },
  })
  if (!feedback) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const isDriver =
    Boolean(feedback.team.serviceTypeId) &&
    (await prisma.driver.findFirst({
      where: {
        personId: person.id,
        serviceTypeId: feedback.team.serviceTypeId ?? undefined,
      },
    }))
  const isLeader = await prisma.leader.findUnique({
    where: {
      personId_teamId: { personId: person.id, teamId: feedback.teamId },
    },
  })
  const canView =
    isDriver ||
    isLeader ||
    feedback.personId === person.id ||
    feedback.status === "accepted"

  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json(feedback)
}
