"use client"

import { useState } from "react"

interface Team {
  id: string
  name: string
}

interface FeedbackItem {
  id: string
  content: string
  leaderComment: string | null
  acceptedAt: string | null
  team: { id: string; name: string }
  createdBy: { name: string | null; email: string | null }
}

export default function MyFeedbackClient({
  initialTeams,
  initialFeedback,
  defaultDays,
}: {
  initialTeams: Team[]
  initialFeedback: FeedbackItem[]
  defaultDays: number
}) {
  const [teamId, setTeamId] = useState<string>("")
  const [feedback, setFeedback] = useState<FeedbackItem[]>(initialFeedback)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [oldestAccepted, setOldestAccepted] = useState<string | null>(
    initialFeedback.length > 0 &&
      initialFeedback[initialFeedback.length - 1]?.acceptedAt
      ? initialFeedback[initialFeedback.length - 1].acceptedAt
      : null
  )

  const loadOlder = async () => {
    if (!oldestAccepted) return
    setLoadingOlder(true)
    try {
      const params = new URLSearchParams({
        before: oldestAccepted,
        limit: "50",
      })
      if (teamId) params.set("teamId", teamId)
      const res = await fetch(`/api/feedback?${params}`)
      if (!res.ok) return
      const older: FeedbackItem[] = await res.json()
      setFeedback((prev) => [...prev, ...older])
      if (older.length > 0 && older[older.length - 1]?.acceptedAt) {
        setOldestAccepted(older[older.length - 1].acceptedAt)
      } else {
        setOldestAccepted(null)
      }
    } finally {
      setLoadingOlder(false)
    }
  }

  const refetch = async (tid: string) => {
    const since = new Date()
    since.setDate(since.getDate() - defaultDays)
    const params = new URLSearchParams({
      since: since.toISOString(),
      limit: "50",
    })
    if (tid) params.set("teamId", tid)
    const res = await fetch(`/api/feedback?${params}`)
    if (!res.ok) return
    const data: FeedbackItem[] = await res.json()
    setFeedback(data)
    setOldestAccepted(
      data.length > 0 && data[data.length - 1]?.acceptedAt
        ? data[data.length - 1].acceptedAt
        : null
    )
  }

  const filtered =
    teamId === "" ? feedback : feedback.filter((f) => f.team.id === teamId)

  return (
    <div className="mt-8 space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <label htmlFor="team" className="changelog-label sr-only">
          Team
        </label>
        <select
          id="team"
          value={teamId}
          onChange={(e) => {
            const v = e.target.value
            setTeamId(v)
            refetch(v)
          }}
          className="changelog-input w-auto min-w-[180px]"
        >
          <option value="">All teams</option>
          {initialTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No accepted feedback in this range.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((f) => (
            <li key={f.id} className="changelog-card p-5">
              <p className="changelog-section-title">
                {f.team.name}
                {f.acceptedAt && (
                  <span className="ml-2 font-normal text-zinc-500">
                    {new Date(f.acceptedAt).toLocaleDateString()}
                  </span>
                )}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                {f.content}
              </p>
              {f.leaderComment && (
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Leader: {f.leaderComment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {oldestAccepted && (
        <button
          type="button"
          onClick={loadOlder}
          disabled={loadingOlder}
          className="changelog-btn-secondary disabled:opacity-50"
        >
          {loadingOlder ? "Loading…" : "Load older"}
        </button>
      )}
    </div>
  )
}
