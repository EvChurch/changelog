import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

import DriverFeedbackForm from "./driver-feedback-form"

export default async function DriverNewPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email,
    fullName: session.user.name,
  })
  const isDriver = await prisma.driver.findUnique({
    where: { id: person.id },
  })
  if (!isDriver) redirect("/driver")

  return (
    <div className="min-h-screen">
      <header className="changelog-header">
        <div className="changelog-container flex h-14 items-center justify-between">
          <Link
            href="/driver"
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
        <Link
          href="/driver"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to driver
        </Link>
        <h1 className="changelog-page-title mt-4">
          Create feedback (as driver)
        </h1>
        <p className="changelog-page-subtitle">
          This will go straight to the team leader for review.
        </p>
        <DriverFeedbackForm />
      </main>
    </div>
  )
}
