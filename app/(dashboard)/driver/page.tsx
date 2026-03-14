import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

export default async function DriverPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email,
    fullName: session.user.name,
  })
  const driverServiceTypes = await prisma.driver.findMany({
    where: { personId: person.id },
    select: { serviceTypeId: true },
  })
  const serviceTypeIds = driverServiceTypes.map(
    (driver) => driver.serviceTypeId
  )
  const isDriver = serviceTypeIds.length > 0

  const pendingReview = isDriver
    ? await prisma.feedback.findMany({
        where: {
          status: "pending_driver_review",
          team: { serviceTypeId: { in: serviceTypeIds } },
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
        <h1 className="changelog-page-title">Driver</h1>
        {!isDriver && (
          <p className="changelog-page-subtitle mt-2">
            You are not a driver. Only drivers can review member-submitted
            feedback or create feedback on behalf of the service.
          </p>
        )}
        {isDriver && (
          <>
            <section className="mt-8">
              <h2 className="changelog-section-title">
                Member-submitted (pending your review)
              </h2>
              {pendingReview.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">None.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {pendingReview.map(
                    (f: {
                      id: string
                      content: string
                      team: { name: string }
                    }) => (
                      <li key={f.id}>
                        <Link
                          href={`/driver/feedback/${f.id}`}
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
            <section className="mt-10">
              <h2 className="changelog-section-title">
                Create feedback as driver
              </h2>
              <Link
                href="/driver/new"
                className="changelog-btn-primary mt-3 inline-flex"
              >
                New feedback
              </Link>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
