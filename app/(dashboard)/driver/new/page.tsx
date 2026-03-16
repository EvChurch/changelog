import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import { ViewerRoleSummaryQuery } from "@/lib/graphql/operations"

import DriverFeedbackForm from "./driver-feedback-form"

export default async function DriverNewPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const apollo = await getServerApolloClient()
  const roleResult = await apollo.query({
    query: ViewerRoleSummaryQuery,
    fetchPolicy: "no-cache",
  })
  if (!roleResult.data?.viewerRoleSummary?.isDriver) redirect("/driver")

  return (
    <>
      <Link
        href="/driver"
        className="text-sm font-medium text-zinc-500 hover:text-church transition-colors dark:hover:text-church"
      >
        ← Back to driver
      </Link>
      <h1 className="changelog-page-title mt-4">Create feedback (as driver)</h1>
      <p className="changelog-page-subtitle">
        This will go straight to the team leader for review.
      </p>
      <DriverFeedbackForm />
    </>
  )
}
