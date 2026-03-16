import { getServerSession, type Session } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

export type GraphQLContext = {
  session: Session | null
  person: Awaited<ReturnType<typeof getOrCreatePersonByPcoId>> | null
}

export async function createGraphQLContext(): Promise<GraphQLContext> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { session: null, person: null }
  }

  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })
  return { session, person }
}

export { prisma }
