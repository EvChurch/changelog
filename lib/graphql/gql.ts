import { initGraphQLTada } from "gql.tada"

import type { introspection } from "@/lib/graphql/generated/introspection"

export const graphql = initGraphQLTada<{
  introspection: typeof introspection
  scalars: {
    DateTime: string
    Json: unknown
  }
}>()

export type { ResultOf, VariablesOf } from "gql.tada"
