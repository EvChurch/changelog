import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const teams = await prisma.team.findMany({
    where: {
      OR: [
        {
          leaders: {
            some: { personId: person.id },
          },
        },
        {
          positions: {
            some: {
              assignments: {
                some: { personId: person.id },
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      serviceType: {
        select: {
          name: true,
        },
      },
      leaders: {
        where: { personId: person.id },
        select: { personId: true },
      },
      positions: {
        select: {
          name: true,
          assignments: {
            where: { personId: person.id },
            select: { personId: true },
          },
        },
      },
    },
  })

  const teamsWithRoles = teams.map((team) => {
    const roles: string[] = []
    const isLeader = team.leaders.length > 0
    const positionNames = Array.from(
      new Set(
        team.positions
          .filter((position) => position.assignments.length > 0)
          .map((position) => position.name?.trim())
          .filter((name): name is string => Boolean(name))
      )
    )
    const isMember = team.positions.some(
      (position) => position.assignments.length > 0
    )

    if (isLeader) roles.push("Team Leader")
    roles.push(...positionNames.sort((a, b) => a.localeCompare(b)))
    if (isMember && positionNames.length === 0) roles.push("Team Member")

    return {
      id: team.id,
      name: team.name,
      serviceTypeName: team.serviceType?.name ?? null,
      roles,
    }
  })

  const teamsByServiceType = new Map<
    string,
    Array<{ id: string; name: string; roles: string[] }>
  >()
  const teamsWithoutServiceType: Array<{
    id: string
    name: string
    roles: string[]
  }> = []

  for (const team of teamsWithRoles) {
    if (!team.serviceTypeName) {
      teamsWithoutServiceType.push(team)
      continue
    }

    const existing = teamsByServiceType.get(team.serviceTypeName) ?? []
    existing.push(team)
    teamsByServiceType.set(team.serviceTypeName, existing)
  }

  const groupedTeams = Array.from(teamsByServiceType.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([serviceTypeName, grouped]) => ({
      serviceTypeName,
      teams: grouped.sort((a, b) => a.name.localeCompare(b.name)),
    }))

  teamsWithoutServiceType.sort((a, b) => a.name.localeCompare(b.name))

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
      <main className="changelog-container py-6">
        <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="changelog-card p-4 lg:sticky lg:top-20 lg:h-fit">
            <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Workspace
            </p>
            <nav className="space-y-1">
              <Link
                href="/dashboard"
                className="changelog-nav-active block px-3 py-2.5 text-sm"
              >
                Overview
              </Link>
            </nav>
            {teamsWithRoles.length > 0 && (
              <>
                <div className="my-3 border-t border-zinc-200 dark:border-zinc-800" />
                {groupedTeams.map((group) => (
                  <div key={group.serviceTypeName} className="mt-3 first:mt-0">
                    <p className="px-2 pb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {group.serviceTypeName}
                    </p>
                    <ul className="space-y-0.5">
                      {group.teams.map((team) => (
                        <li key={team.id}>
                          <Link
                            href={`/teams/${team.id}`}
                            className="block rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-church-muted/50 hover:text-church dark:text-zinc-300 dark:hover:bg-church-muted/30 dark:hover:text-church"
                          >
                            {team.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {teamsWithoutServiceType.length > 0 && (
                  <div className="mt-3">
                    <p className="px-2 pb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      No Service Type
                    </p>
                    <ul className="space-y-0.5">
                      {teamsWithoutServiceType.map((team) => (
                        <li key={team.id}>
                          <Link
                            href={`/teams/${team.id}`}
                            className="block rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-church-muted/50 hover:text-church dark:text-zinc-300 dark:hover:bg-church-muted/30 dark:hover:text-church"
                          >
                            {team.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </aside>

          <section className="mt-4 lg:mt-0 lg:pl-6">
            <h1 className="changelog-page-title">Overview</h1>
            <p className="changelog-page-subtitle">
              Your workspace at a glance.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Reviews awaiting you
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  —
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Goals to check
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  —
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
