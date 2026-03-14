"use client"

import { useMemo, useState } from "react"

interface PersonItem {
  id: string
  fullName: string
  email: string | null
}

interface Roster {
  leaders: PersonItem[]
  positions: Array<{
    id: string
    name: string
    members: PersonItem[]
  }>
}

interface TeamMemberDetail {
  person: PersonItem & { image: string | null }
  teamRoles: {
    isLeader: boolean
    positions: string[]
  }
  otherTeams: Array<{ id: string; name: string }>
}

export default function TeamMembersClient({
  teamId,
  roster,
}: {
  teamId: string
  roster: Roster
}) {
  const [membersLoadingId, setMembersLoadingId] = useState<string | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [memberDetail, setMemberDetail] = useState<TeamMemberDetail | null>(
    null
  )

  const visiblePositions = useMemo(
    () => roster.positions.filter((p) => p.members.length > 0),
    [roster.positions]
  )
  const teamMembers = useMemo(() => {
    const map = new Map<string, PersonItem>()
    for (const leader of roster.leaders) map.set(leader.id, leader)
    for (const position of visiblePositions) {
      for (const member of position.members) {
        map.set(member.id, member)
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    )
  }, [roster.leaders, visiblePositions])

  const loadMember = async (memberId: string) => {
    setMembersLoadingId(memberId)
    setSelectedMemberId(memberId)
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${memberId}`)
      if (!res.ok) return
      const detail: TeamMemberDetail = await res.json()
      setMemberDetail(detail)
    } finally {
      setMembersLoadingId(null)
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="changelog-card p-4">
        <h2 className="changelog-section-title">Team members</h2>
        <ul className="mt-3 space-y-2">
          {teamMembers.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => loadMember(member.id)}
                className={
                  selectedMemberId === member.id
                    ? "w-full rounded-md border border-zinc-300 bg-zinc-100 px-3 py-2 text-left text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    : "w-full rounded-md border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                }
              >
                {member.fullName}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="changelog-card p-4">
        <h2 className="changelog-section-title">Member details</h2>
        {membersLoadingId ? (
          <p className="mt-2 text-sm text-zinc-500">Loading...</p>
        ) : !memberDetail ? (
          <p className="mt-2 text-sm text-zinc-500">Select a member.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              {memberDetail.person.fullName}
            </p>
            {memberDetail.person.email && (
              <p className="text-sm text-zinc-500">
                {memberDetail.person.email}
              </p>
            )}
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {memberDetail.teamRoles.isLeader ? "Team leader" : "Team member"}
              {memberDetail.teamRoles.positions.length > 0
                ? ` - ${memberDetail.teamRoles.positions.join(", ")}`
                : ""}
            </p>
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Other teams
              </p>
              {memberDetail.otherTeams.length === 0 ? (
                <p className="mt-1 text-sm text-zinc-500">
                  No other team assignments.
                </p>
              ) : (
                <ul className="mt-1 list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                  {memberDetail.otherTeams.map((team) => (
                    <li key={team.id}>{team.name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
