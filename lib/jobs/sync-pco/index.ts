import type PgBoss from "pg-boss"

import { SyncPcoJob } from "./job"

export const SYNC_PCO_QUEUE = "sync-pco"

export async function startSyncPcoWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(SYNC_PCO_QUEUE)
  await boss.work(SYNC_PCO_QUEUE, SyncPcoJob)
  // Run every hour
  boss.schedule(SYNC_PCO_QUEUE, "0 * * * *")
  boss.send(SYNC_PCO_QUEUE, {})
}
