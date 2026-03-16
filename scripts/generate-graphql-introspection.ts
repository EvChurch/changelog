import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { introspectionFromSchema, printSchema } from "graphql"

import { schema } from "../lib/graphql/schema"

async function main() {
  const outDir = join(process.cwd(), "lib/graphql/generated")
  await mkdir(outDir, { recursive: true })

  const introspection = introspectionFromSchema(schema)
  const introspectionJson = JSON.stringify(introspection, null, 2)
  const schemaSdl = printSchema(schema)

  await writeFile(join(outDir, "introspection.json"), introspectionJson)
  await writeFile(
    join(outDir, "introspection.ts"),
    `export const introspection = ${introspectionJson} as const\n`
  )
  await writeFile(join(outDir, "schema.graphql"), `${schemaSdl}\n`)
}

void main()
