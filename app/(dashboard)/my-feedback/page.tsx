import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import type { ResultOf } from "@/lib/graphql/gql"
import { FeedbackListQuery, TeamsQuery } from "@/lib/graphql/operations"

import MyFeedbackClient from "./my-feedback-client"

const DEFAULT_DAYS = 90

export default async function MyFeedbackPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const apollo = await getServerApolloClient()
  const teamsResult = await apollo.query({
    query: TeamsQuery,
    fetchPolicy: "no-cache",
  })
  const teams =
    (teamsResult.data as ResultOf<typeof TeamsQuery> | null)?.teams ?? []

  const since = new Date()
  since.setDate(since.getDate() - DEFAULT_DAYS)
  const feedbackResult = await apollo.query({
    query: FeedbackListQuery,
    variables: { input: { since: since.toISOString(), limit: 50 } },
    fetchPolicy: "no-cache",
  })
  const serialized = (
    (feedbackResult.data as ResultOf<typeof FeedbackListQuery> | null)
      ?.feedbackList ?? []
  ).map((f) => ({
    ...f,
    acceptedAt: f.acceptedAt ?? null,
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
