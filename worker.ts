import { getBoss, SYNC_PCO_QUEUE } from "@/lib/pg-boss";
import { runPcoSync } from "@/lib/sync-pco";

const SYNC_INTERVAL_MS = 15 * 60 * 1000;
const FIRST_SYNC_DELAY_MS = 30 * 1000;

async function main() {
  const boss = await getBoss();
  await boss.work(SYNC_PCO_QUEUE, async (job) => {
    if (!job) return;
    const result = await runPcoSync();
    console.log("[worker] sync-pco ok, teams:", result.teamsSynced);
  });
  const sendSyncJob = () =>
    boss.send(SYNC_PCO_QUEUE, {}).then((id) => console.log("[worker] sync job sent:", id));
  setTimeout(sendSyncJob, FIRST_SYNC_DELAY_MS);
  setInterval(sendSyncJob, SYNC_INTERVAL_MS);
  console.log("[worker] pg-boss listening for", SYNC_PCO_QUEUE);
}

main().catch((e) => {
  console.error("[worker]", e);
  process.exit(1);
});
