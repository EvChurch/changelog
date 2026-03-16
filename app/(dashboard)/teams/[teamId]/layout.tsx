import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import { TeamQuery } from "@/lib/graphql/operations"

export default async function TeamLayout({
  params,
  children,
}: {
  params: Promise<{ teamId: string }>
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { teamId } = await params
  const apollo = await getServerApolloClient()
  const result = await apollo.query({
    query: TeamQuery,
    variables: { teamId },
    fetchPolicy: "no-cache",
  })
  const team = result.data?.team
  if (!team) notFound()

  return (
    <>
      <h1 className="changelog-page-title pb-4">{team.name}</h1>
      {children}
    </>
  )
}
