import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"

import FeedbackForm from "./feedback-form"

export default async function NewFeedbackPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
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
        <h1 className="changelog-page-title">Submit feedback</h1>
        <p className="changelog-page-subtitle">
          Choose a team and describe the feedback. A driver will review it
          before it goes to the team leader.
        </p>
        <FeedbackForm />
      </main>
    </div>
  )
}
