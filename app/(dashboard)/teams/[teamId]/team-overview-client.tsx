"use client"

import { useState } from "react"

export default function TeamOverviewClient({
  teamId,
  canEditContent,
  teamDescriptionMarkdown,
}: {
  teamId: string
  canEditContent: boolean
  teamDescriptionMarkdown: string | null
}) {
  const [draft, setDraft] = useState(teamDescriptionMarkdown ?? "")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!canEditContent) return
    setSaving(true)
    try {
      await fetch(`/api/teams/${teamId}/content`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptionMarkdown: draft }),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="changelog-card p-4">
      <h2 className="changelog-section-title">Team description</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Markdown-style content for team purpose and cadence.
      </p>
      <textarea
        rows={10}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={!canEditContent}
        className="changelog-input mt-3 resize-y disabled:opacity-60"
        placeholder="Describe this team."
      />
      {canEditContent && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="changelog-btn-secondary mt-3 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save team description"}
        </button>
      )}
    </section>
  )
}
