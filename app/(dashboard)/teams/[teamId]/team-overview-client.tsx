"use client"

import MarkdownDescriptionCard from "@/components/markdown-description-card"

export default function TeamOverviewClient({
  teamId,
  canEditContent,
  teamDescriptionMarkdown,
}: {
  teamId: string
  canEditContent: boolean
  teamDescriptionMarkdown: string | null
}) {
  const onSave = async (descriptionMarkdown: string) => {
    await fetch(`/api/teams/${teamId}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptionMarkdown }),
    })
  }

  return (
    <MarkdownDescriptionCard
      content={teamDescriptionMarkdown}
      canEdit={canEditContent}
      onSave={onSave}
      emptyPlaceholder="Describe this team."
    />
  )
}
