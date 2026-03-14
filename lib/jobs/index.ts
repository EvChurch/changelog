import type PgBoss from "pg-boss"

import { startSyncPcoWorker } from "./sync-pco"

export async function startWorkers(boss: PgBoss): Promise<void> {
  await startSyncPcoWorker(boss)
}
