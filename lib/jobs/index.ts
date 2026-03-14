import type PgBoss from "pg-boss"

import { startSyncPcoWorker } from "./sync-pco/worker"

export { SYNC_PCO_QUEUE } from "./queues"

export async function startWorkers(boss: PgBoss): Promise<void> {
  await startSyncPcoWorker(boss)
}
