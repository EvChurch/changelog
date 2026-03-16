"use client"

import { useApolloClient } from "@apollo/client/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import type { ResultOf } from "@/lib/graphql/gql"
import { CreateFeedbackMutation, TeamsQuery } from "@/lib/graphql/operations"

interface Team {
  id: string
  name: string
}

export default function FeedbackForm() {
  const apollo = useApolloClient()
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [teamId, setTeamId] = useState("")

  useEffect(() => {
    apollo
      .query({ query: TeamsQuery, fetchPolicy: "no-cache" })
      .then((result) => {
        const data = result.data as ResultOf<typeof TeamsQuery> | null
        if (!data?.teams) throw new Error("Failed to load teams")
        setTeams(
          data.teams
            .filter(
              (team): team is { id: string; name: string } =>
                typeof team.id === "string" && typeof team.name === "string"
            )
            .map((team) => ({ id: team.id, name: team.name }))
        )
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [apollo])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !teamId) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await apollo.mutate({
        mutation: CreateFeedbackMutation,
        variables: {
          content: content.trim(),
          teamId,
          asDriver: false,
        },
      })
      const data = result.data as ResultOf<typeof CreateFeedbackMutation> | null
      if (!data?.createFeedback?.id) throw new Error("Failed to submit")
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return <p className="mt-6 text-sm text-zinc-500">Loading teams…</p>
  if (teams.length === 0 && !error) {
    return (
      <p className="mt-6 text-sm text-zinc-500">
        No teams found. Pass serviceTypeId to sync a service type, or run the
        worker to sync all.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="team" className="changelog-label">
          Team
        </label>
        <select
          id="team"
          required
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="changelog-input mt-1.5"
        >
          <option value="">Select a team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="content" className="changelog-label">
          Feedback
        </label>
        <textarea
          id="content"
          required
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="changelog-input mt-1.5 resize-y"
          placeholder="Describe the feedback…"
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !content.trim() || !teamId}
        className="changelog-btn-primary disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  )
}
