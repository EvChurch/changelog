import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import {
  PositionContentQuery,
  WorkspaceTeamsQuery,
} from "@/lib/graphql/operations"

import PositionDescriptionClient from "./position-description-client"

export default async function PositionDescriptionPage({
  params,
}: {
  params: Promise<{ teamId: string; positionId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { positionId } = await params
  const apollo = await getServerApolloClient()
  const [positionResult, teamsResult] = await Promise.all([
    apollo.query({
      query: PositionContentQuery,
      variables: { positionId },
      fetchPolicy: "no-cache",
    }),
    apollo.query({
      query: WorkspaceTeamsQuery,
      fetchPolicy: "no-cache",
    }),
  ])
  const position = positionResult.data?.positionContent
  if (!position) notFound()
  const team = teamsResult.data?.workspaceTeams?.find(
    (item) => item.id === position.teamId
  )
  const canEditContent = Boolean(team?.isLeader || team?.isEligibleDriver)

  return (
    <PositionDescriptionClient
      positionId={position.id}
      canEditContent={canEditContent}
      descriptionMarkdown={position.descriptionMarkdown}
    />
  )
}
