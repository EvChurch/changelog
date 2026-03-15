import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

import DriverActions from "./driver-actions"

export default async function DriverFeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const { id } = await params
  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email,
    fullName: session.user.name,
  })
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      team: { select: { name: true, serviceTypeId: true } },
      createdBy: { select: { fullName: true, email: true } },
    },
  })
  if (!feedback || feedback.status !== "pending_driver_review") notFound()

  const isDriver =
    Boolean(feedback.team.serviceTypeId) &&
    (await prisma.driver.findFirst({
      where: {
        personId: person.id,
        serviceTypeId: feedback.team.serviceTypeId ?? undefined,
      },
    }))
  if (!isDriver) redirect("/driver")

  return (
    <>
      <Link
        href="/driver"
        className="text-sm font-medium text-zinc-500 hover:text-church transition-colors dark:hover:text-church"
      >
        ← Back to driver
      </Link>
      <div className="changelog-card mt-6 p-5">
        <p className="changelog-section-title">{feedback.team.name}</p>
        <p className="mt-3 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
          {feedback.content}
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          From: {feedback.createdBy.fullName ?? feedback.createdBy.email ?? "—"}
        </p>
      </div>
      <DriverActions feedbackId={id} />
    </>
  )
}
