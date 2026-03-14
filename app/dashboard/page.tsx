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
      <main className="changelog-container py-8">
        <h1 className="changelog-page-title">Dashboard</h1>
        <p className="changelog-page-subtitle">
          Submit feedback, review as driver or leader, or view accepted
          feedback.
        </p>
        <nav className="mt-8 flex flex-wrap gap-3">
          <Link href="/feedback/new" className="changelog-btn-primary">
            Submit feedback
          </Link>
          <Link href="/driver" className="changelog-btn-secondary">
            Driver
          </Link>
          <Link href="/leader" className="changelog-btn-secondary">
            Team Leader
          </Link>
          <Link href="/my-feedback" className="changelog-btn-secondary">
            My team feedback
          </Link>
        </nav>
        <section className="mt-10">
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
                      <li key={team.id} className="changelog-card p-4">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {team.name}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {team.roles.join(" · ")}
                        </p>
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
                      <li key={team.id} className="changelog-card p-4">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {team.name}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {team.roles.join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
