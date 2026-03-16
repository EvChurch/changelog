"use client"

import { useApolloClient } from "@apollo/client/react"

import MarkdownDescriptionCard from "@/components/markdown-description-card"
import { UpdateTeamContentMutation } from "@/lib/graphql/operations"

export default function TeamOverviewClient({
  teamId,
  canEditContent,
  teamDescriptionMarkdown,
}: {
  teamId: string
  canEditContent: boolean
  teamDescriptionMarkdown: string | null
}) {
  const apollo = useApolloClient()

  const onSave = async (descriptionMarkdown: string) => {
    await apollo.mutate({
      mutation: UpdateTeamContentMutation,
      variables: { teamId, descriptionMarkdown },
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
