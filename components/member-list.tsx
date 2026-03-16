"use client"

import { useApolloClient } from "@apollo/client/react"
import { useMemo, useState } from "react"

import type { ResultOf } from "@/lib/graphql/gql"
import { TeamMemberQuery } from "@/lib/graphql/operations"

interface PersonItem {
  id: string
  fullName: string
  email: string | null
}

interface OtherTeam {
  id: string
  name: string
  serviceTypeName: string | null
}

interface MemberDetail {
  person: PersonItem & { image: string | null }
  teamRoles: {
    isLeader: boolean
    positions: string[]
  }
  otherTeams: OtherTeam[]
}

function groupByServiceType(teams: OtherTeam[]) {
  const groups = new Map<string, OtherTeam[]>()
  for (const team of teams) {
    const key = team.serviceTypeName ?? ""
    const list = groups.get(key)
    if (list) list.push(team)
    else groups.set(key, [team])
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (!a) return 1
      if (!b) return -1
      return a.localeCompare(b)
    })
    .map(([serviceType, items]) => ({
      serviceType: serviceType || null,
      teams: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

export default function MemberList({
  teamId,
  members,
  emptyMessage = "No members.",
}: {
  teamId: string
  members: PersonItem[]
  emptyMessage?: string
}) {
  const apollo = useApolloClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<MemberDetail | null>(null)

  const loadMember = async (memberId: string) => {
    if (selectedId === memberId) {
      setSelectedId(null)
      setDetail(null)
      return
    }
    setLoadingId(memberId)
    setSelectedId(memberId)
    try {
      const result = await apollo.query({
        query: TeamMemberQuery,
        variables: { teamId, personId: memberId },
        fetchPolicy: "no-cache",
      })
      const data = (result.data as ResultOf<typeof TeamMemberQuery> | null)
        ?.teamMember
      if (!data) return
      setDetail(data as MemberDetail)
    } finally {
      setLoadingId(null)
    }
  }

  if (members.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>
  }

  return (
    <ul className="space-y-1">
      {members.map((member) => {
        const isSelected = selectedId === member.id
        const isLoading = loadingId === member.id
        return (
          <li key={member.id}>
            <button
              type="button"
              onClick={() => loadMember(member.id)}
              className={
                isSelected
                  ? "w-full rounded-md bg-zinc-100 px-3 py-2.5 text-left text-sm font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "w-full rounded-md px-3 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50"
              }
            >
              {member.fullName}
            </button>
            {isSelected && (
              <div className="ml-3 border-l-2 border-zinc-200 pl-3 pb-2 dark:border-zinc-700">
                {isLoading ? (
                  <p className="py-2 text-sm text-zinc-500">Loading...</p>
                ) : detail ? (
                  <div className="space-y-1.5 py-2 text-sm">
                    {detail.person.email && (
                      <p className="text-zinc-500">{detail.person.email}</p>
                    )}
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {detail.teamRoles.isLeader
                        ? "Team leader"
                        : "Team member"}
                      {detail.teamRoles.positions.length > 0
                        ? ` · ${detail.teamRoles.positions.join(", ")}`
                        : ""}
                    </p>
                    {detail.otherTeams.length > 0 && (
                      <OtherTeamsGrouped teams={detail.otherTeams} />
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function OtherTeamsGrouped({ teams }: { teams: OtherTeam[] }) {
  const grouped = useMemo(() => groupByServiceType(teams), [teams])

  return (
    <div className="space-y-2">
      <p className="font-medium text-zinc-700 dark:text-zinc-300">Also on</p>
      {grouped.map((group) => (
        <div key={group.serviceType ?? "_none"}>
          {group.serviceType && (
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {group.serviceType}
            </p>
          )}
          <ul className="mt-0.5 list-disc pl-5 text-zinc-500">
            {group.teams.map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
