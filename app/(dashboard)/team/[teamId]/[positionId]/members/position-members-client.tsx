"use client"

import MemberList from "@/components/member-list"

export default function PositionMembersClient({
  teamId,
  members,
}: {
  teamId: string
  members: Array<{ id: string; fullName: string; email: string | null }>
}) {
  return (
    <MemberList
      teamId={teamId}
      members={members}
      emptyMessage="No members assigned to this role."
    />
  )
}
