import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

export default async function LeaderPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email,
    fullName: session.user.name,
  })
  const leaderTeams = await prisma.leader.findMany({
    where: { personId: person.id },
    include: { team: true },
  })
  const teamIds = leaderTeams.map((l) => l.teamId)
  const pending =
    teamIds.length > 0
      ? await prisma.feedback.findMany({
          where: {
            teamId: { in: teamIds },
            status: "pending_leader_review",
          },
          include: {
            team: { select: { name: true } },
            createdBy: { select: { fullName: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : []

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
        <h1 className="changelog-page-title">Team Leader</h1>
        {leaderTeams.length === 0 && (
          <p className="changelog-page-subtitle mt-2">
            You are not assigned as a leader for any team.
          </p>
        )}
        {leaderTeams.length > 0 && (
          <section className="mt-8">
            <h2 className="changelog-section-title">Pending your review</h2>
            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">None.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {pending.map(
                  (f: {
                    id: string
                    content: string
                    team: { name: string }
                  }) => (
                    <li key={f.id}>
                      <Link
                        href={`/leader/feedback/${f.id}`}
                        className="changelog-card-hover block p-4"
                      >
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {f.team.name}
                        </span>
                        <span className="mx-2 text-zinc-400">·</span>
                        <span className="text-zinc-600 dark:text-zinc-400 line-clamp-1">
                          {f.content}
                        </span>
                      </Link>
                    </li>
                  )
                )}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
