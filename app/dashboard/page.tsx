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
            className="font-semibold text-zinc-900 dark:text-zinc-100"
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
          <aside className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-20 lg:h-fit">
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Workspace
            </p>
            <nav className="space-y-1">
              <Link
                href="/dashboard"
                className="block rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              >
                Overview
              </Link>
              <Link
                href="/feedback/new"
                className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                Submit feedback
              </Link>
              <Link
                href="/my-feedback"
                className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                Team feedback
              </Link>
            </nav>
            <div className="my-3 border-t border-zinc-200 dark:border-zinc-800" />
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Reviews
            </p>
            <nav className="space-y-1">
              <Link
                href="/driver"
                className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                Driver
              </Link>
              <Link
                href="/leader"
                className="block rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                Team Leader
              </Link>
            </nav>
          </aside>

          <section className="mt-4 lg:mt-0 lg:pl-6">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h1 className="changelog-page-title">Dashboard</h1>
              <p className="changelog-page-subtitle">
                Open a team, review updates, and keep feedback flowing.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="changelog-section-title">My Teams</h2>
              {teamsWithRoles.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  You are not currently assigned to any teams.
                </p>
              ) : (
                <div className="mt-4 space-y-6">
                  {groupedTeams.map((group) => (
                    <div key={group.serviceTypeName}>
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        {group.serviceTypeName}
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {group.teams.map((team) => (
                          <li key={team.id}>
                            <Link
                              href={`/teams/${team.id}`}
                              className="changelog-card-hover block p-4"
                            >
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                {team.name}
                              </p>
                              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                {team.roles.join(" · ")}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {teamsWithoutServiceType.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        No Service Type
                      </h3>
                      <ul className="mt-2 space-y-2">
                        {teamsWithoutServiceType.map((team) => (
                          <li key={team.id}>
                            <Link
                              href={`/teams/${team.id}`}
                              className="changelog-card-hover block p-4"
                            >
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                {team.name}
                              </p>
                              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                {team.roles.join(" · ")}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
