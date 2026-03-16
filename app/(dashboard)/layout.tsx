import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import ThemeToggle from "@/components/theme-toggle"
import { authOptions } from "@/lib/auth"
import { getServerApolloClient } from "@/lib/graphql/apollo-rsc"
import { WorkspaceTeamsQuery } from "@/lib/graphql/operations"

import WorkspaceSidebar from "./workspace-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const apollo = await getServerApolloClient()
  const result = await apollo.query({
    query: WorkspaceTeamsQuery,
    fetchPolicy: "no-cache",
  })
  const teamsWithRoles = result.data?.workspaceTeams ?? []

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
    <div className="min-h-screen flex flex-col">
      <header className="changelog-header shrink-0 w-full">
        <div className="w-full px-4 sm:px-6 flex h-14 items-center justify-between">
          <Link
            href="/dashboard"
            className="font-bold text-church text-lg tracking-tight hover:text-church-hover transition-colors"
          >
            Changelog
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {session.user.email}
            </span>
          </div>
        </div>
      </header>
      <div className="flex flex-1 min-h-0 min-h-[calc(100vh-3.5rem)]">
        <WorkspaceSidebar
          groupedTeams={groupedTeams}
          teamsWithoutServiceType={teamsWithoutServiceType}
        />
        <main className="flex-1 min-w-0 changelog-container py-6 pl-6">
          {children}
        </main>
      </div>
    </div>
  )
}
