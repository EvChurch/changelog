"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function TeamNav({ teamId }: { teamId: string }) {
  const pathname = usePathname()
  const base = `/teams/${teamId}`

  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      <Link
        href={base}
        className={
          pathname === base
            ? "changelog-nav-active px-4 py-2.5 text-sm"
            : "rounded-md border-2 border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:border-church/30 hover:text-church dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-church/40 dark:hover:text-church"
        }
      >
        Overview
      </Link>
      <Link
        href={`${base}/feedback`}
        className={
          pathname === `${base}/feedback`
            ? "changelog-nav-active px-4 py-2.5 text-sm"
            : "rounded-md border-2 border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:border-church/30 hover:text-church dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-church/40 dark:hover:text-church"
        }
      >
        Feedback
      </Link>
      <Link
        href={`${base}/members`}
        className={
          pathname === `${base}/members`
            ? "changelog-nav-active px-4 py-2.5 text-sm"
            : "rounded-md border-2 border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:border-church/30 hover:text-church dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-church/40 dark:hover:text-church"
        }
      >
        Members
      </Link>
    </nav>
  )
}
