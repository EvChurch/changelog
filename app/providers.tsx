"use client"

import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"

import { GraphQLProvider } from "@/lib/graphql/apollo-client"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <GraphQLProvider>{children}</GraphQLProvider>
    </SessionProvider>
  )
}
