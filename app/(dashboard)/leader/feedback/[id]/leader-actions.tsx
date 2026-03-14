"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LeaderActions({ feedbackId }: { feedbackId: string }) {
  const router = useRouter()
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "leader_accept",
          comment: comment.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error("Request failed")
      router.push("/leader")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 space-y-5">
      <div>
        <label htmlFor="comment" className="changelog-label">
          Comment (optional)
        </label>
        <textarea
          id="comment"
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="changelog-input mt-1.5 resize-y"
          placeholder="Add a note for the team"
        />
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="changelog-btn-success disabled:opacity-50"
      >
        {loading ? "Accepting…" : "Accept feedback"}
      </button>
    </div>
  )
}
