import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import {
  FeedbackListQuery,
  ViewerRoleSummaryQuery,
} from "@/lib/graphql/operations"

export default async function DriverPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const apollo = await getServerApolloClient()
  const [roleResult, pendingResult] = await Promise.all([
    apollo.query({ query: ViewerRoleSummaryQuery, fetchPolicy: "no-cache" }),
    apollo
      .query({
        query: FeedbackListQuery,
        variables: { input: { role: "driver", limit: 50 } },
        fetchPolicy: "no-cache",
      })
      .catch(() => ({ data: { feedbackList: [] } })),
  ])
  const isDriver = Boolean(roleResult.data?.viewerRoleSummary?.isDriver)
  const pendingReview = isDriver ? (pendingResult.data?.feedbackList ?? []) : []

  return (
    <>
      <h1 className="changelog-page-title">Driver</h1>
      {!isDriver && (
        <p className="changelog-page-subtitle mt-2">
          You are not a driver. Only drivers can review member-submitted
          feedback or create feedback on behalf of the service.
        </p>
      )}
      {isDriver && (
        <>
          <section className="mt-8">
            <h2 className="changelog-section-title">
              Member-submitted (pending your review)
            </h2>
            {pendingReview.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">None.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {pendingReview.map(
                  (f: {
                    id: string
                    content: string
                    team: { name: string }
                  }) => (
                    <li key={f.id}>
                      <Link
                        href={`/driver/feedback/${f.id}`}
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
                  )
                )}
              </ul>
            )}
          </section>
          <section className="mt-10">
            <h2 className="changelog-section-title">
              Create feedback as driver
            </h2>
            <Link
              href="/driver/new"
              className="changelog-btn-primary mt-3 inline-flex"
            >
              New feedback
            </Link>
          </section>
        </>
      )}
    </>
  )
}
