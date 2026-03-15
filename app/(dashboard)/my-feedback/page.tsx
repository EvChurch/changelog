import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

import MyFeedbackClient from "./my-feedback-client"

const DEFAULT_DAYS = 90

export default async function MyFeedbackPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email,
    fullName: session.user.name,
  })

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  const since = new Date()
  since.setDate(since.getDate() - DEFAULT_DAYS)
  const accepted = await prisma.feedback.findMany({
    where: { status: "accepted", acceptedAt: { gte: since } },
    include: {
      team: { select: { id: true, name: true } },
      createdBy: { select: { fullName: true, email: true } },
    },
    orderBy: { acceptedAt: "desc" },
  })
  const serialized = accepted.map((f) => ({
    ...f,
    acceptedAt: f.acceptedAt?.toISOString() ?? null,
  }))

  return (
    <>
      <h1 className="changelog-page-title">My team feedback</h1>
      <p className="changelog-page-subtitle">
        Accepted feedback for the last {DEFAULT_DAYS} days. Use “Load older” to
        see more.
      </p>
      <MyFeedbackClient
        initialTeams={teams}
        initialFeedback={serialized}
        defaultDays={DEFAULT_DAYS}
      />
    </>
  )
}
