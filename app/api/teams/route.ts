import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { fetchTeams } from "@/lib/pco";
import { getOrCreateTeamByPcoId } from "@/lib/user";
import { syncLeadersFromPCO } from "@/lib/sync-leaders";
import { getServerPcoAccessToken } from "@/lib/server-pco";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const serviceTypeId = searchParams.get("serviceTypeId") ?? process.env.PCO_SERVICE_TYPE_ID;
  if (!serviceTypeId) {
    return NextResponse.json(
      { error: "Missing serviceTypeId query or PCO_SERVICE_TYPE_ID env" },
      { status: 400 }
    );
  }
  try {
    const accessToken = await getServerPcoAccessToken();
    const pcoTeams = await fetchTeams(accessToken, serviceTypeId);
    const teams = await Promise.all(
      pcoTeams.map((t) => getOrCreateTeamByPcoId(t.id, t.name))
    );
    await syncLeadersFromPCO(accessToken, serviceTypeId, teams);
    return NextResponse.json(
      teams.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }))
    );
  } catch (e) {
    console.error("PCO teams fetch error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch teams" },
      { status: 502 }
    );
  }
}
