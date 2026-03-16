"use client"

import { useApolloClient } from "@apollo/client/react"
import { AnimatePresence, motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import type { ResultOf } from "@/lib/graphql/gql"
import { TeamQuery } from "@/lib/graphql/operations"

type TeamItem = { id: string; name: string; roles: string[] }
type GroupedTeams = { serviceTypeName: string; teams: TeamItem[] }

type TeamForSidebar = {
  id: string
  name: string
  positions: { id: string; name: string }[]
}

const SIDEBAR_WRAPPER =
  "w-[260px] shrink-0 self-stretch flex flex-col border-r border-zinc-200 dark:border-zinc-800"
const SIDEBAR_INNER =
  "flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden relative"

export default function WorkspaceSidebar({
  groupedTeams,
  teamsWithoutServiceType,
}: {
  groupedTeams: GroupedTeams[]
  teamsWithoutServiceType: TeamItem[]
}) {
  const apollo = useApolloClient()
  const pathname = usePathname()
  const teamMatch = pathname.match(/^\/teams\/([^/]+)/)
  const teamId = teamMatch?.[1]
  const positionMatch = pathname.match(/^\/team\/([^/]+)\/([^/]+)/)
  const positionTeamId = positionMatch?.[1]
  const positionId = positionMatch?.[2]

  const [team, setTeam] = useState<TeamForSidebar | null>(null)
  const hasTeams =
    groupedTeams.some((g) => g.teams.length > 0) ||
    teamsWithoutServiceType.length > 0

  const viewKey =
    positionTeamId && positionId
      ? `position-${positionTeamId}-${positionId}`
      : teamId
        ? `team-${teamId}`
        : "dashboard"

  useEffect(() => {
    const id = teamId ?? positionTeamId
    if (!id) return
    let cancelled = false
    apollo
      .query({
        query: TeamQuery,
        variables: { teamId: id },
        fetchPolicy: "no-cache",
      })
      .then(
        (result) =>
          ((result.data as ResultOf<typeof TeamQuery> | null)?.team as
            | TeamForSidebar
            | undefined) ?? null
      )
      .then((data) => {
        if (!cancelled && data) setTeam(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [apollo, teamId, positionTeamId])

  const linkClass = (active: boolean) =>
    active
      ? "changelog-nav-active block px-3 py-2.5 text-sm"
      : "changelog-nav-inactive block rounded-md px-3 py-2.5 text-sm text-zinc-600 transition-colors hover:bg-church-muted/50 hover:text-church dark:text-zinc-300 dark:hover:bg-church-muted/30 dark:hover:text-church"

  // forward = new panel from right; back = previous panel from left
  const dir: "forward" | "back" = "forward"
  const sidebarVariants = {
    enter: (d: string) => ({ x: d === "forward" ? "100%" : "-100%" }),
    center: { x: 0 },
    exit: (d: string) => ({ x: d === "forward" ? "-100%" : "100%" }),
  }

  const sidebarLoader =
    "h-8 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700"

  let content: React.ReactNode
  if (positionTeamId && positionId) {
    const base = `/team/${positionTeamId}/${positionId}`
    content = (
      <>
        {team ? (
          <Link
            href={`/teams/${positionTeamId}`}
            className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-church-muted/50 hover:text-church transition-colors"
          >
            ← Back to {team.name}
          </Link>
        ) : (
          <Link
            href={`/teams/${positionTeamId}`}
            className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-church-muted/50 hover:text-church transition-colors"
          >
            ← Back to team
          </Link>
        )}
        <nav className="mt-3 space-y-1">
          <Link href={base} className={linkClass(pathname === base)}>
            Overview
          </Link>
          <Link
            href={`${base}/goals`}
            className={linkClass(pathname === `${base}/goals`)}
          >
            Goals
          </Link>
          <Link
            href={`${base}/members`}
            className={linkClass(pathname === `${base}/members`)}
          >
            Members
          </Link>
        </nav>
      </>
    )
  } else if (teamId) {
    const base = `/teams/${teamId}`
    content = (
      <>
        <Link
          href="/dashboard"
          className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-church-muted/50 hover:text-church transition-colors"
        >
          ← Back to Dashboard
        </Link>
        <nav className="mt-3 space-y-1">
          <Link href={base} className={linkClass(pathname === base)}>
            Overview
          </Link>
          <Link
            href={`${base}/feedback`}
            className={linkClass(pathname === `${base}/feedback`)}
          >
            Feedback
          </Link>
          <Link
            href={`${base}/members`}
            className={linkClass(pathname === `${base}/members`)}
          >
            Members
          </Link>
        </nav>
        <div className="my-3 border-t border-zinc-200 dark:border-zinc-800" />
        <p className="px-2 pb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Roles
        </p>
        {team?.positions && team.positions.length > 0 ? (
          <ul className="space-y-0.5">
            {team.positions.map((pos) => (
              <li key={pos.id}>
                <Link
                  href={`/team/${teamId}/${pos.id}`}
                  className="block rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-church-muted/50 hover:text-church dark:text-zinc-300 dark:hover:bg-church-muted/30 dark:hover:text-church"
                >
                  {pos.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={sidebarLoader} />
        )}
      </>
    )
  } else {
    content = (
      <>
        <nav className="space-y-1">
          <Link
            href="/dashboard"
            className={linkClass(pathname === "/dashboard")}
          >
            Dashboard
          </Link>
        </nav>
        {hasTeams && (
          <>
            <div className="my-3 border-t border-zinc-200 dark:border-zinc-800" />
            {groupedTeams.map((group) => (
              <div key={group.serviceTypeName} className="mt-3 first:mt-0">
                <p className="px-2 pb-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {group.serviceTypeName}
                </p>
                <ul className="space-y-0.5">
                  {group.teams.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/teams/${t.id}`}
                        className="block rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-church-muted/50 hover:text-church dark:text-zinc-300 dark:hover:bg-church-muted/30 dark:hover:text-church"
                      >
                        {t.name}
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
                  {teamsWithoutServiceType.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/teams/${t.id}`}
                        className="block rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-church-muted/50 hover:text-church dark:text-zinc-300 dark:hover:bg-church-muted/30 dark:hover:text-church"
                      >
                        {t.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </>
    )
  }

  return (
    <aside className={SIDEBAR_WRAPPER}>
      <div className={SIDEBAR_INNER}>
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={viewKey}
            custom={dir}
            variants={sidebarVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute inset-0 flex flex-col min-h-0 w-full p-4"
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  )
}
