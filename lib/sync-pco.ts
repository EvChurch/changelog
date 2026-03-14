import { fetchTeams } from "@/lib/pco";
import { getOrCreateTeamByPcoId } from "@/lib/user";
import { syncLeadersFromPCO } from "@/lib/sync-leaders";
import { getServerPcoAccessToken } from "@/lib/server-pco";

export async function runPcoSync(): Promise<{ teamsSynced: number }> {
  const serviceTypeId = process.env.PCO_SERVICE_TYPE_ID;
  if (!serviceTypeId) throw new Error("PCO_SERVICE_TYPE_ID not set");

  const accessToken = await getServerPcoAccessToken();
  const pcoTeams = await fetchTeams(accessToken, serviceTypeId);
  const teams = await Promise.all(
    pcoTeams.map((t) => getOrCreateTeamByPcoId(t.id, t.name))
  );
  await syncLeadersFromPCO(accessToken, serviceTypeId, teams);
  return { teamsSynced: teams.length };
}
