import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

import PositionDescriptionClient from "./position-description-client"

export default async function PositionDescriptionPage({
  params,
}: {
  params: Promise<{ teamId: string; positionId: string }>
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
      descriptionMarkdown: true,
      team: {
        select: {
          id: true,
          serviceTypeId: true,
          leaders: { select: { personId: true } },
          positions: {
            select: { assignments: { select: { personId: true } } },
          },
        },
      },
    },
  })

  if (!position) notFound()

  const team = position.team
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

  const canEditContent = isLeader || isEligibleDriver

  return (
    <PositionDescriptionClient
      positionId={position.id}
      canEditContent={canEditContent}
      descriptionMarkdown={position.descriptionMarkdown}
    />
  )
}
