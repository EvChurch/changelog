import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    NEXTAUTH_SECRET: z.string().min(1),
    NEXTAUTH_URL: z.string().url(),
    PCO_CLIENT_ID: z.string().min(1),
    PCO_CLIENT_SECRET: z.string().min(1),
    PCO_API_KEY: z.string().min(1),
    PCO_SERVICE_TYPE_ID: z.string().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    PCO_CLIENT_ID: process.env.PCO_CLIENT_ID,
    PCO_CLIENT_SECRET: process.env.PCO_CLIENT_SECRET,
    PCO_API_KEY: process.env.PCO_API_KEY,
    PCO_SERVICE_TYPE_ID: process.env.PCO_SERVICE_TYPE_ID,
  },
})
