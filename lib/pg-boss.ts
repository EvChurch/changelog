import PgBoss from "pg-boss";

let instance: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL required for pg-boss");
    instance = new PgBoss(url);
    instance.on("error", (e) => console.error("[pg-boss]", e));
    await instance.start();
  }
  return instance;
}

export const SYNC_PCO_QUEUE = "sync-pco";
