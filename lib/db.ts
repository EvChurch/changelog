import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient } from "@/generated/prisma/client"
import { env } from "@/lib/env"

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

function descriptionToMarkdown(value: unknown) {
  if (typeof value === "string") {
    return value
  }
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "markdown" in value &&
    typeof value.markdown === "string"
  ) {
    return value.markdown
  }
  return null
}

export const prisma = new PrismaClient({ adapter }).$extends({
  result: {
    team: {
      descriptionMarkdown: {
        needs: { description: true },
        compute(team) {
          return descriptionToMarkdown(team.description)
        },
      },
    },
    position: {
      descriptionMarkdown: {
        needs: { description: true },
        compute(position) {
          return descriptionToMarkdown(position.description)
        },
      },
    },
  },
})
