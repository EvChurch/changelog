"use client"

import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client"
import { ApolloProvider } from "@apollo/client/react"
import type { ReactNode } from "react"
import { useMemo } from "react"

export function GraphQLProvider({ children }: { children: ReactNode }) {
  const client = useMemo(
    () =>
      new ApolloClient({
        cache: new InMemoryCache(),
        link: new HttpLink({
          uri: "/api/graphql",
        }),
      }),
    []
  )

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}
