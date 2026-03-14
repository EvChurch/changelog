import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

import PositionNav from "./position-nav"

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
      team: { select: { id: true, name: true } },
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
    <div className="min-h-screen">
      <header className="changelog-header">
        <div className="changelog-container flex h-14 items-center justify-between">
          <Link
            href="/dashboard"
            className="font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Changelog
          </Link>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {session.user.email}
          </span>
        </div>
      </header>
      <main className="changelog-container py-8">
        <Link
          href={`/teams/${teamId}`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to {position.team.name}
        </Link>
        <h1 className="changelog-page-title mt-3">{positionName}</h1>

        <PositionNav teamId={teamId} positionId={positionId} />

        <div className="mt-8">{children}</div>
      </main>
    </div>
  )
}
