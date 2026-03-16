import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import { PositionContentQuery } from "@/lib/graphql/operations"

export default async function PositionLayout({
  params,
  children,
}: {
  params: Promise<{ teamId: string; positionId: string }>
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { positionId } = await params
  const apollo = await getServerApolloClient()
  const result = await apollo.query({
    query: PositionContentQuery,
    variables: { positionId },
    fetchPolicy: "no-cache",
  })
  const position = result.data?.positionContent
  if (!position) notFound()

  const positionName = position.name?.trim() || "Team Member"

  return (
    <>
      <h1 className="changelog-page-title">{positionName}</h1>
      <div className="mt-6">{children}</div>
    </>
  )
}
