import { prisma } from "@/lib/db"
import { fetchPerson, fetchTeamLeaders } from "@/lib/pco"
import { getOrCreateUserByPcoId } from "@/lib/user"

export async function syncLeadersFromPCO(
  serviceTypeId: string,
  teams: { id: string; pcoTeamId: string }[]
) {
  for (const team of teams) {
    let leaders: { personId: string }[]
    try {
      leaders = await fetchTeamLeaders(serviceTypeId, team.pcoTeamId)
    } catch {
      continue
    }
    for (const { personId } of leaders) {
      let name: string | undefined
      let email: string | undefined
      try {
        const person = await fetchPerson(personId)
        name = person.name
        email = person.email
      } catch {
        name = undefined
        email = undefined
      }
      const user = await getOrCreateUserByPcoId(personId, { name, email })
      await prisma.leader.upsert({
        where: {
          userId_teamId: { userId: user.id, teamId: team.id },
        },
        create: { userId: user.id, teamId: team.id },
        update: {},
      })
    }
  }
}
