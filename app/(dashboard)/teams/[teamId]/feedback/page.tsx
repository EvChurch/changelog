import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import type { ResultOf } from "@/lib/graphql/gql"
import { FeedbackListQuery } from "@/lib/graphql/operations"

import TeamFeedbackClient from "../team-feedback-client"

const DEFAULT_DAYS = 90
type FeedbackRow = {
  id: string
  content: string
  status: "pending_driver_review" | "pending_leader_review" | "accepted"
  source: "driver" | "member"
  leaderComment: string | null
  driverComment: string | null
  createdAt: string
  acceptedAt: string | null
  reviewedByDriverAt: string | null
  team: { id: string; name: string }
  createdBy: { fullName: string; email: string | null }
}
type FeedbackListData = ResultOf<typeof FeedbackListQuery>

export default async function TeamFeedbackPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const apollo = await getServerApolloClient()

  const { teamId } = await params

  const sinceDate = new Date()
  sinceDate.setDate(sinceDate.getDate() - DEFAULT_DAYS)
  let isLeader = false
  let initialFeedback: FeedbackRow[] | null = null

  try {
    const leaderResult = await apollo.query({
      query: FeedbackListQuery,
      variables: {
        input: {
          role: "team_leader",
          teamId,
          limit: 50,
        },
      },
      fetchPolicy: "no-cache",
    })
    isLeader = true
    initialFeedback = (leaderResult.data as FeedbackListData | null)
      ?.feedbackList as FeedbackRow[] | null
  } catch {
    const memberResult = await apollo.query({
      query: FeedbackListQuery,
      variables: {
        input: {
          teamId,
          since: sinceDate.toISOString(),
          includePendingMine: true,
          limit: 50,
        },
      },
      fetchPolicy: "no-cache",
    })
    initialFeedback = (memberResult.data as FeedbackListData | null)
      ?.feedbackList as FeedbackRow[] | null
  }

  if (!initialFeedback) {
    notFound()
  }

  const deduped = Array.from(
    new Map(initialFeedback.map((item) => [item.id, item])).values()
  ).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <TeamFeedbackClient
      teamId={teamId}
      isLeader={isLeader}
      defaultDays={DEFAULT_DAYS}
      initialFeedback={deduped.map((item) => ({
        ...item,
        createdAt: item.createdAt,
        acceptedAt: item.acceptedAt ?? null,
        reviewedByDriverAt: item.reviewedByDriverAt ?? null,
      }))}
    />
  )
}
