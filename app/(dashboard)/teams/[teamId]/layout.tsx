import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

import TeamNav from "./team-nav"

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
          name: true,
          assignments: { select: { personId: true } },
        },
        orderBy: { name: "asc" },
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

  const visiblePositions = team.positions.filter(
    (p) => p.assignments.length > 0
  )
  const rolePositions = isLeader
    ? visiblePositions
    : visiblePositions.filter((p) =>
        p.assignments.some((a) => a.personId === person.id)
      )

  return (
    <div className="min-h-screen">
      <header className="changelog-header">
        <div className="changelog-container flex h-14 items-center justify-between">
          <Link
            href="/dashboard"
            className="font-bold text-church text-lg tracking-tight hover:text-church-hover transition-colors"
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
          href="/dashboard"
          className="text-sm font-medium text-zinc-500 hover:text-church transition-colors dark:hover:text-church"
        >
          ← Back to dashboard
        </Link>
        <h1 className="changelog-page-title mt-3">{team.name}</h1>

        <TeamNav teamId={team.id} />

        {rolePositions.length > 0 && (
          <div className="mt-6">
            <h2 className="changelog-section-title">Roles</h2>
            <ul className="mt-2 space-y-1">
              {rolePositions.map((position) => (
                <li key={position.id} className="text-sm">
                  <Link
                    href={`/team/${team.id}/${position.id}`}
                    className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    {position.name?.trim() || "Team Member"}
                  </Link>
                  {" · "}
                  <Link
                    href={`/team/${team.id}/${position.id}/goals`}
                    className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Goals
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8">{children}</div>
      </main>
    </div>
  )
}
