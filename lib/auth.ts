import type { NextAuthOptions } from "next-auth"
import type { OAuthConfig } from "next-auth/providers/oauth"

import { env } from "@/lib/env"

interface PCOProfile {
  sub: string
  name?: string
  email?: string
  organization_name?: string
}

const PlanningCenterProvider: OAuthConfig<PCOProfile> = {
  id: "pco",
  name: "Planning Center Online",
  type: "oauth",
  wellKnown:
    "https://api.planningcenteronline.com/.well-known/openid-configuration",
  authorization: {
    params: {
      scope: "openid people services",
    },
  },
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name ?? undefined,
      email: profile.email ?? undefined,
      image: undefined,
    }
  },
  clientId: env.PCO_CLIENT_ID,
  clientSecret: env.PCO_CLIENT_SECRET,
}

export const authOptions: NextAuthOptions = {
  providers: [PlanningCenterProvider],
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
}
