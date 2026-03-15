"use client"

import { useMemo } from "react"

import MemberList from "@/components/member-list"

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

export default function TeamMembersClient({
  teamId,
  roster,
}: {
  teamId: string
  roster: Roster
}) {
  const teamMembers = useMemo(() => {
    const map = new Map<string, PersonItem>()
    for (const leader of roster.leaders) map.set(leader.id, leader)
    for (const position of roster.positions) {
      for (const member of position.members) {
        if (member) map.set(member.id, member)
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName)
    )
  }, [roster.leaders, roster.positions])

  return <MemberList teamId={teamId} members={teamMembers} />
}
