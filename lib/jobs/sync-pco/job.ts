import { syncLeadersFromPCO } from "@/lib/jobs/sync-pco/sync-leaders"
import { syncMembersFromPCO } from "@/lib/jobs/sync-pco/sync-members"
import { fetchServiceTypes, fetchTeams } from "@/lib/pco"
import {
  getOrCreateServiceTypeByPcoId,
  getOrCreateTeamByPcoId,
} from "@/lib/user"

export async function syncPco(): Promise<{
  serviceTypesSynced: number
  teamsSynced: number
}> {
  const pcoServiceTypes = await fetchServiceTypes()
  let teamsSynced = 0
  for (const st of pcoServiceTypes) {
    const serviceType = await getOrCreateServiceTypeByPcoId(st.id, st.name)
    const pcoTeams = await fetchTeams(st.id)
    const teams = await Promise.all(
      pcoTeams.map((t) => getOrCreateTeamByPcoId(t.id, t.name, serviceType.id))
    )
    await syncLeadersFromPCO(st.id, teams)
    await syncMembersFromPCO(st.id, teams)
    teamsSynced += teams.length
  }
  return { serviceTypesSynced: pcoServiceTypes.length, teamsSynced }
}
