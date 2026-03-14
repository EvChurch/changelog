"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function PositionNav({
  teamId,
  positionId,
}: {
  teamId: string
  positionId: string
}) {
  const pathname = usePathname()
  const base = `/team/${teamId}/${positionId}`

  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      <Link
        href={base}
        className={
          pathname === base
            ? "changelog-btn-secondary"
            : "rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        }
      >
        Description
      </Link>
      <Link
        href={`${base}/goals`}
        className={
          pathname === `${base}/goals`
            ? "changelog-btn-secondary"
            : "rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        }
      >
        Goals
      </Link>
    </nav>
  )
}
