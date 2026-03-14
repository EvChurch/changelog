"use client"

import { useState } from "react"

export default function PositionDescriptionClient({
  positionId,
  canEditContent,
  descriptionMarkdown,
}: {
  positionId: string
  canEditContent: boolean
  descriptionMarkdown: string | null
}) {
  const [draft, setDraft] = useState(descriptionMarkdown ?? "")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!canEditContent) return
    setSaving(true)
    try {
      await fetch(`/api/positions/${positionId}/content`, {
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
      <h2 className="changelog-section-title">Role description</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Markdown-style content for this role.
      </p>
      <textarea
        rows={10}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={!canEditContent}
        className="changelog-input mt-3 resize-y disabled:opacity-60"
        placeholder="Describe this role."
      />
      {canEditContent && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="changelog-btn-secondary mt-3 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save role description"}
        </button>
      )}
    </section>
  )
}
