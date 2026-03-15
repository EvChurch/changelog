import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"

import FeedbackForm from "./feedback-form"

export default async function NewFeedbackPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  return (
    <>
      <h1 className="changelog-page-title">Submit feedback</h1>
      <p className="changelog-page-subtitle">
        Choose a team and describe the feedback. A driver will review it before
        it goes to the team leader.
      </p>
      <FeedbackForm />
    </>
  )
}
