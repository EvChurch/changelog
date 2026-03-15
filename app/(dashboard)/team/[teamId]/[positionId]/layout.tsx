import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

export default async function PositionLayout({
  params,
  children,
}: {
  params: Promise<{ teamId: string; positionId: string }>
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { teamId, positionId } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const position = await prisma.position.findUnique({
    where: { id: positionId, teamId },
    select: {
      id: true,
      name: true,
      teamId: true,
    },
  })

  if (!position) notFound()

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      serviceTypeId: true,
      leaders: { select: { personId: true } },
      positions: {
        select: { assignments: { select: { personId: true } } },
      },
    },
  })
  if (!team) notFound()

  const isLeader = team.leaders.some((l) => l.personId === person.id)
  const isMember = team.positions.some((p) =>
    p.assignments.some((a) => a.personId === person.id)
  )
  const isEligibleDriver = Boolean(
    team.serviceTypeId &&
    (await prisma.driver.findUnique({
      where: {
        personId_serviceTypeId: {
          personId: person.id,
          serviceTypeId: team.serviceTypeId ?? "",
        },
      },
    }))
  )

  if (!isLeader && !isMember && !isEligibleDriver) notFound()

  const positionName = position.name?.trim() || "Team Member"

  return (
    <>
      <h1 className="changelog-page-title">{positionName}</h1>
      <div className="mt-6">{children}</div>
    </>
  )
}
