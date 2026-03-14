import { prisma } from "@/lib/db"
import { fetchPerson, fetchTeamMemberPersonIds } from "@/lib/pco"
import { getOrCreateUserByPcoId } from "@/lib/user"

export async function syncMembersFromPCO(
  serviceTypeId: string,
  teams: { id: string; pcoTeamId: string }[]
) {
  for (const team of teams) {
    let personIds: string[]
    try {
      personIds = await fetchTeamMemberPersonIds(serviceTypeId, team.pcoTeamId)
    } catch {
      continue
    }
    for (const personId of personIds) {
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
      await prisma.teamMember.upsert({
        where: {
          userId_teamId: { userId: user.id, teamId: team.id },
        },
        create: { userId: user.id, teamId: team.id },
        update: {},
      })
    }
  }
}
