import { NextResponse } from "next/server";
import { getBoss, SYNC_PCO_QUEUE } from "@/lib/pg-boss";

export async function GET() {
  try {
    const boss = await getBoss();
    const jobId = await boss.send(SYNC_PCO_QUEUE, {});
    return NextResponse.json({ ok: true, jobId });
  } catch (e) {
    console.error("Sync PCO send error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed" },
      { status: 502 }
    );
  }
}
