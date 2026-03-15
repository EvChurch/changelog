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
  const isDriver = await prisma.driver.findFirst({
    where: { personId: person.id },
  })
  if (!isDriver) redirect("/driver")

  return (
    <>
      <Link
        href="/driver"
        className="text-sm font-medium text-zinc-500 hover:text-church transition-colors dark:hover:text-church"
      >
        ← Back to driver
      </Link>
      <h1 className="changelog-page-title mt-4">Create feedback (as driver)</h1>
      <p className="changelog-page-subtitle">
        This will go straight to the team leader for review.
      </p>
      <DriverFeedbackForm />
    </>
  )
}
