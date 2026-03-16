import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import { TeamContentQuery, WorkspaceTeamsQuery } from "@/lib/graphql/operations"

import TeamOverviewClient from "./team-overview-client"

export default async function TeamOverviewPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { teamId } = await params
  const apollo = await getServerApolloClient()
  const [contentResult, teamsResult] = await Promise.all([
    apollo.query({
      query: TeamContentQuery,
      variables: { teamId },
      fetchPolicy: "no-cache",
    }),
    apollo.query({
      query: WorkspaceTeamsQuery,
      fetchPolicy: "no-cache",
    }),
  ])
  const team = contentResult.data?.teamContent
  if (!team) notFound()
  const workspaceTeam =
    teamsResult.data?.workspaceTeams?.find((item) => item.id === teamId) ?? null
  const canEditContent = Boolean(
    workspaceTeam?.isLeader || workspaceTeam?.isEligibleDriver
  )

  return (
    <TeamOverviewClient
      teamId={team.id}
      canEditContent={canEditContent}
      teamDescriptionMarkdown={team.descriptionMarkdown}
    />
  )
}
