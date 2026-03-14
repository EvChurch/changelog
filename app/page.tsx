import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="changelog-page-title text-3xl">Changelog</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Service feedback for your teams
        </p>
      </div>
      <Link href="/login" className="changelog-btn-primary">
        Sign in with Planning Center
      </Link>
    </div>
  )
}
