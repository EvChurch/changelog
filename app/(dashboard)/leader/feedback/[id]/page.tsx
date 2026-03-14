import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

import LeaderActions from "./leader-actions"

export default async function LeaderFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const { id } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email,
    fullName: session.user.name,
  })
  const isLeader = await prisma.leader.findFirst({
    where: { personId: person.id },
  })
  if (!isLeader) redirect("/leader")

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      team: true,
      createdBy: { select: { fullName: true, email: true } },
    },
  })
  if (!feedback || feedback.status !== "pending_leader_review") notFound()
  const canAct = await prisma.leader.findUnique({
    where: {
      personId_teamId: { personId: person.id, teamId: feedback.teamId },
    },
  })
  if (!canAct) redirect("/leader")

  return (
    <div className="min-h-screen">
      <header className="changelog-header">
        <div className="changelog-container flex h-14 items-center justify-between">
          <Link
            href="/leader"
            className="font-bold text-church text-lg tracking-tight hover:text-church-hover transition-colors"
          >
            Changelog
          </Link>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {session.user.email}
          </span>
        </div>
      </header>
      <main className="changelog-container py-8">
        <Link
          href="/leader"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to leader
        </Link>
        <div className="changelog-card mt-6 p-5">
          <p className="changelog-section-title">{feedback.team.name}</p>
          <p className="mt-3 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {feedback.content}
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            From:{" "}
            {feedback.createdBy.fullName ?? feedback.createdBy.email ?? "—"}
          </p>
          {feedback.driverComment && (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              Driver note: {feedback.driverComment}
            </p>
          )}
        </div>
        <LeaderActions feedbackId={id} />
      </main>
    </div>
  )
}
