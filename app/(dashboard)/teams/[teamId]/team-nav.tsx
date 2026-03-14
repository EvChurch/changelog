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
            ? "changelog-btn-secondary"
            : "rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        }
      >
        Overview
      </Link>
      <Link
        href={`${base}/feedback`}
        className={
          pathname === `${base}/feedback`
            ? "changelog-btn-secondary"
            : "rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        }
      >
        Feedback
      </Link>
      <Link
        href={`${base}/members`}
        className={
          pathname === `${base}/members`
            ? "changelog-btn-secondary"
            : "rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        }
      >
        Members
      </Link>
    </nav>
  )
}
