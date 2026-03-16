import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import { PositionMembersQuery } from "@/lib/graphql/operations"

import PositionMembersClient from "./position-members-client"

export default async function PositionMembersPage({
  params,
}: {
  params: Promise<{ teamId: string; positionId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { teamId, positionId } = await params
  const apollo = await getServerApolloClient()
  const result = await apollo.query({
    query: PositionMembersQuery,
    variables: { teamId, positionId },
    fetchPolicy: "no-cache",
  })
  const position = result.data?.positionMembers
  if (!position) notFound()
  const members = [...position.members].sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  )

  return <PositionMembersClient teamId={teamId} members={members} />
}
