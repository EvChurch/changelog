import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

export default async function TeamLayout({
  params,
  children,
}: {
  params: Promise<{ teamId: string }>
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { teamId } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      serviceTypeId: true,
      leaders: { select: { personId: true } },
      positions: {
        select: {
          id: true,
          assignments: { select: { personId: true } },
        },
      },
    },
  })

  if (!team) notFound()

  const isLeader = team.leaders.some((l) => l.personId === person.id)
  const isMember = team.positions.some((position) =>
    position.assignments.some((a) => a.personId === person.id)
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

  return (
    <>
      <h1 className="changelog-page-title pb-4">{team.name}</h1>
      {children}
    </>
  )
}
