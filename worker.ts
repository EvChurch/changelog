import { startWorkers } from "@/lib/jobs"
import { getBoss } from "@/lib/pg-boss"

async function main() {
  const boss = await getBoss()
  await startWorkers(boss)
}

main().catch((e) => {
  console.error("[worker]", e)
  process.exit(1)
})
