import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import {
  PositionContentQuery,
  TeamRosterQuery,
  WorkspaceTeamsQuery,
} from "@/lib/graphql/operations"

import PositionGoalsClient from "../position-goals-client"

export default async function PositionGoalsPage({
  params,
}: {
  params: Promise<{ teamId: string; positionId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { teamId, positionId } = await params
  const apollo = await getServerApolloClient()
  const [positionResult, rosterResult, teamsResult] = await Promise.all([
    apollo.query({
      query: PositionContentQuery,
      variables: { positionId },
      fetchPolicy: "no-cache",
    }),
    apollo.query({
      query: TeamRosterQuery,
      variables: { teamId },
      fetchPolicy: "no-cache",
    }),
    apollo.query({
      query: WorkspaceTeamsQuery,
      fetchPolicy: "no-cache",
    }),
  ])
  const position = positionResult.data?.positionContent
  if (!position) notFound()
  const roster = rosterResult.data?.teamRoster
  if (!roster) notFound()
  const teamInfo =
    teamsResult.data?.workspaceTeams?.find((item) => item.id === teamId) ?? null
  const canEditGoals = Boolean(
    teamInfo?.isLeader || teamInfo?.isMember || teamInfo?.isEligibleDriver
  )

  const teamMembersMap = new Map<
    string,
    { id: string; fullName: string; email: string | null }
  >()
  for (const pos of roster.positions) {
    for (const member of pos.members) {
      teamMembersMap.set(member.id, {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
      })
    }
  }
  for (const leader of roster.leaders) {
    teamMembersMap.set(leader.id, {
      id: leader.id,
      fullName: leader.fullName,
      email: leader.email,
    })
  }
  const teamMembers = Array.from(teamMembersMap.values()).sort((a, b) =>
    a.fullName.localeCompare(b.fullName)
  )

  return (
    <PositionGoalsClient
      positionId={position.id}
      canEditGoals={canEditGoals}
      teamMembers={teamMembers}
    />
  )
}
