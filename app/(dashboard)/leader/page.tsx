import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import {
  FeedbackListQuery,
  WorkspaceTeamsQuery,
} from "@/lib/graphql/operations"

export default async function LeaderPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const apollo = await getServerApolloClient()
  const [teamsResult, pendingResult] = await Promise.all([
    apollo.query({
      query: WorkspaceTeamsQuery,
      fetchPolicy: "no-cache",
    }),
    apollo.query({
      query: FeedbackListQuery,
      variables: { input: { role: "leader", limit: 50 } },
      fetchPolicy: "no-cache",
    }),
  ])
  const hasLeaderTeam =
    teamsResult.data?.workspaceTeams?.some((team) => team.isLeader) ?? false
  const pending = pendingResult.data?.feedbackList ?? []

  return (
    <>
      <h1 className="changelog-page-title">Team Leader</h1>
      {!hasLeaderTeam && (
        <p className="changelog-page-subtitle mt-2">
          You are not assigned as a leader for any team.
        </p>
      )}
      {hasLeaderTeam && (
        <section className="mt-8">
          <h2 className="changelog-section-title">Pending your review</h2>
          {pending.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">None.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pending.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/leader/feedback/${f.id}`}
                    className="changelog-card-hover block p-4"
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {f.team.name}
                    </span>
                    <span className="mx-2 text-zinc-400">·</span>
                    <span className="text-zinc-600 dark:text-zinc-400 line-clamp-1">
                      {f.content}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
