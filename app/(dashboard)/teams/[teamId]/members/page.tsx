import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import { TeamRosterQuery } from "@/lib/graphql/operations"

import TeamMembersClient from "../team-members-client"

export default async function TeamMembersPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { teamId } = await params
  const apollo = await getServerApolloClient()
  const result = await apollo.query({
    query: TeamRosterQuery,
    variables: { teamId },
    fetchPolicy: "no-cache",
  })
  const rosterData = result.data?.teamRoster
  if (!rosterData) notFound()

  const roster = {
    leaders: [...rosterData.leaders].sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    ),
    positions: rosterData.positions.map((position) => ({
      id: position.id,
      name: position.name,
      members: [...position.members].sort((a, b) =>
        a.fullName.localeCompare(b.fullName)
      ),
    })),
  }

  return <TeamMembersClient teamId={teamId} roster={roster} />
}
