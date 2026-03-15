"use client"

import MarkdownDescriptionCard from "@/components/markdown-description-card"

export default function PositionDescriptionClient({
  positionId,
  canEditContent,
  descriptionMarkdown,
}: {
  positionId: string
  canEditContent: boolean
  descriptionMarkdown: string | null
}) {
  const onSave = async (markdown: string) => {
    await fetch(`/api/positions/${positionId}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptionMarkdown: markdown }),
    })
  }

  return (
    <MarkdownDescriptionCard
      content={descriptionMarkdown}
      canEdit={canEditContent}
      onSave={onSave}
      emptyPlaceholder="Describe this role."
    />
  )
}
