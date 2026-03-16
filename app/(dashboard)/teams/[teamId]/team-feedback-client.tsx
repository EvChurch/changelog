"use client"

import { useApolloClient } from "@apollo/client/react"
import { useState } from "react"

import type { ResultOf } from "@/lib/graphql/gql"
import {
  FeedbackActionMutation,
  FeedbackListQuery,
} from "@/lib/graphql/operations"

type FeedbackStatus =
  | "pending_driver_review"
  | "pending_leader_review"
  | "accepted"

interface FeedbackItem {
  id: string
  content: string
  status: FeedbackStatus
  source: "driver" | "member"
  leaderComment: string | null
  driverComment: string | null
  createdAt: string
  acceptedAt: string | null
  reviewedByDriverAt: string | null
  team: { id: string; name: string }
  createdBy: { fullName: string; email: string | null }
}

interface DraftState {
  content: string
  comment: string
}

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  pending_driver_review: "Pending driver",
  pending_leader_review: "Pending leader",
  accepted: "Accepted",
}

export default function TeamFeedbackClient({
  teamId,
  isLeader,
  defaultDays,
  initialFeedback,
}: {
  teamId: string
  isLeader: boolean
  defaultDays: number
  initialFeedback: FeedbackItem[]
}) {
  const apollo = useApolloClient()
  const [feedback, setFeedback] = useState<FeedbackItem[]>(initialFeedback)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadingById, setLoadingById] = useState<Record<string, boolean>>({})
  const [oldestAccepted, setOldestAccepted] = useState<string | null>(
    !isLeader &&
      initialFeedback.length > 0 &&
      initialFeedback[initialFeedback.length - 1]?.acceptedAt
      ? initialFeedback[initialFeedback.length - 1].acceptedAt
      : null
  )
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() => {
    const next: Record<string, DraftState> = {}
    for (const item of initialFeedback) {
      next[item.id] = {
        content: item.content,
        comment: item.leaderComment ?? "",
      }
    }
    return next
  })

  const refreshLeaderList = async () => {
    const result = await apollo.query({
      query: FeedbackListQuery,
      variables: {
        input: { role: "team_leader", teamId, limit: 50 },
      },
      fetchPolicy: "no-cache",
    })
    const latest =
      (result.data as ResultOf<typeof FeedbackListQuery> | null)
        ?.feedbackList ?? []
    setFeedback(latest)
    setDrafts((prev) => {
      const next = { ...prev }
      for (const item of latest) {
        next[item.id] ??= {
          content: item.content,
          comment: item.leaderComment ?? "",
        }
      }
      return next
    })
  }

  const setDraft = (id: string, patch: Partial<DraftState>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        content: patch.content ?? prev[id]?.content ?? "",
        comment: patch.comment ?? prev[id]?.comment ?? "",
      },
    }))
  }

  const runLeaderAction = async (
    id: string,
    action: "leader_accept" | "leader_reject" | "leader_edit"
  ) => {
    const draft = drafts[id]
    setLoadingById((prev) => ({ ...prev, [id]: true }))
    try {
      const payload: {
        action: "leader_accept" | "leader_reject" | "leader_edit"
        comment?: string
        content?: string
      } = {
        action,
        comment: draft?.comment.trim() || undefined,
      }
      if (action === "leader_edit") {
        payload.content = draft?.content
      }
      const result = await apollo.mutate({
        mutation: FeedbackActionMutation,
        variables: {
          id,
          action: payload.action,
          comment: payload.comment,
          content: payload.content,
        },
      })
      const data = result.data as ResultOf<typeof FeedbackActionMutation> | null
      if (!data?.feedbackAction?.ok) return
      await refreshLeaderList()
    } finally {
      setLoadingById((prev) => ({ ...prev, [id]: false }))
    }
  }

  const loadOlderMemberFeedback = async () => {
    if (!oldestAccepted || isLeader) return
    setLoadingOlder(true)
    try {
      const result = await apollo.query({
        query: FeedbackListQuery,
        variables: {
          input: {
            teamId,
            before: oldestAccepted,
            limit: 50,
          },
        },
        fetchPolicy: "no-cache",
      })
      const older =
        (result.data as ResultOf<typeof FeedbackListQuery> | null)
          ?.feedbackList ?? []
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

  return (
    <section>
      <h2 className="changelog-section-title">Feedback</h2>
      {!isLeader && (
        <p className="mt-1 text-sm text-zinc-500">
          Showing accepted feedback from last {defaultDays} days plus your
          pending items.
        </p>
      )}

      {feedback.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No feedback found.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {feedback.map((item) => {
            const draft = drafts[item.id] ?? {
              content: item.content,
              comment: item.leaderComment ?? "",
            }
            return (
              <li key={item.id} className="changelog-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-zinc-500">
                    {STATUS_LABEL[item.status]}
                  </span>
                  <span className="text-xs text-zinc-400">-</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(
                      item.acceptedAt ?? item.createdAt
                    ).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-zinc-400">-</span>
                  <span className="text-xs text-zinc-500">
                    {item.createdBy.fullName}
                  </span>
                </div>

                {isLeader ? (
                  <div className="mt-3 space-y-3">
                    <textarea
                      rows={4}
                      value={draft.content}
                      onChange={(e) =>
                        setDraft(item.id, { content: e.target.value })
                      }
                      className="changelog-input resize-y"
                    />
                    <textarea
                      rows={2}
                      value={draft.comment}
                      onChange={(e) =>
                        setDraft(item.id, { comment: e.target.value })
                      }
                      placeholder="Leader note (optional)"
                      className="changelog-input resize-y"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => runLeaderAction(item.id, "leader_edit")}
                        disabled={loadingById[item.id]}
                        className="changelog-btn-secondary disabled:opacity-50"
                      >
                        Save edit
                      </button>
                      {item.status === "pending_leader_review" && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              runLeaderAction(item.id, "leader_accept")
                            }
                            disabled={loadingById[item.id]}
                            className="changelog-btn-success disabled:opacity-50"
                          >
                            Approve for view
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              runLeaderAction(item.id, "leader_reject")
                            }
                            disabled={loadingById[item.id]}
                            className="changelog-btn-secondary disabled:opacity-50"
                          >
                            Return to driver
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-3 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                      {item.content}
                    </p>
                    {item.leaderComment && (
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        Team Leader: {item.leaderComment}
                      </p>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!isLeader && oldestAccepted && (
        <button
          type="button"
          onClick={loadOlderMemberFeedback}
          disabled={loadingOlder}
          className="changelog-btn-secondary mt-4 disabled:opacity-50"
        >
          {loadingOlder ? "Loading..." : "Load older"}
        </button>
      )}
    </section>
  )
}
