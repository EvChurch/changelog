import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import { LeaderFeedbackQuery } from "@/lib/graphql/operations"

import LeaderActions from "./leader-actions"

export default async function LeaderFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const { id } = await params
  const apollo = await getServerApolloClient()
  const feedback = await apollo
    .query({
      query: LeaderFeedbackQuery,
      variables: { id },
      fetchPolicy: "no-cache",
    })
    .then((result) => result.data?.leaderFeedback ?? null)
    .catch(() => null)
  if (!feedback) notFound()

  return (
    <>
      <Link
        href="/leader"
        className="text-sm font-medium text-zinc-500 hover:text-church transition-colors dark:hover:text-church"
      >
        ← Back to leader
      </Link>
      <div className="changelog-card mt-6 p-5">
        <p className="changelog-section-title">{feedback.team.name}</p>
        <p className="mt-3 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
          {feedback.content}
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          From: {feedback.createdBy.fullName ?? feedback.createdBy.email ?? "—"}
        </p>
        {feedback.driverComment && (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Driver note: {feedback.driverComment}
          </p>
        )}
      </div>
      <LeaderActions feedbackId={id} />
    </>
  )
}
