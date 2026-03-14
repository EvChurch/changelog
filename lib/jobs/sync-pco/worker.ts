import type PgBoss from "pg-boss"

import { SYNC_PCO_QUEUE } from "@/lib/jobs/queues"

import { syncPco } from "./job"

const INTERVAL_MS = 15 * 60 * 1000
const FIRST_DELAY_MS = 30 * 1000

export async function startSyncPcoWorker(boss: PgBoss): Promise<void> {
  await boss.work(SYNC_PCO_QUEUE, async (job) => {
    if (!job) return
    const result = await syncPco()
    console.log(
      "[worker] sync-pco ok, serviceTypes:",
      result.serviceTypesSynced,
      "teams:",
      result.teamsSynced
    )
  })
  const send = () =>
    boss
      .send(SYNC_PCO_QUEUE, {})
      .then((id) => console.log("[worker] sync job sent:", id))
  setTimeout(send, FIRST_DELAY_MS)
  setInterval(send, INTERVAL_MS)
  console.log("[worker] listening for", SYNC_PCO_QUEUE)
}
