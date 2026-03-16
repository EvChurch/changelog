"use client"

import { useApolloClient } from "@apollo/client/react"

import MarkdownDescriptionCard from "@/components/markdown-description-card"
import { UpdatePositionContentMutation } from "@/lib/graphql/operations"

export default function PositionDescriptionClient({
  positionId,
  canEditContent,
  descriptionMarkdown,
}: {
  positionId: string
  canEditContent: boolean
  descriptionMarkdown: string | null
}) {
  const apollo = useApolloClient()

  const onSave = async (markdown: string) => {
    await apollo.mutate({
      mutation: UpdatePositionContentMutation,
      variables: { positionId, descriptionMarkdown: markdown },
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
