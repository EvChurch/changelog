import { fetchTeamLeaders, fetchPerson } from "@/lib/pco";
import { getOrCreateUserByPcoId } from "@/lib/user";
import { prisma } from "@/lib/db";

export async function syncLeadersFromPCO(
  accessToken: string,
  serviceTypeId: string,
  teams: { id: string; pcoTeamId: string }[]
) {
  for (const team of teams) {
    let leaders: { personId: string }[];
    try {
      leaders = await fetchTeamLeaders(accessToken, serviceTypeId, team.pcoTeamId);
    } catch {
      continue;
    }
    for (const { personId } of leaders) {
      let name: string | undefined;
      let email: string | undefined;
      try {
        const person = await fetchPerson(accessToken, personId);
        name = person.name;
        email = person.email;
      } catch {
        name = undefined;
        email = undefined;
      }
      const user = await getOrCreateUserByPcoId(personId, { name, email });
      await prisma.leader.upsert({
        where: {
          userId_teamId: { userId: user.id, teamId: team.id },
        },
        create: { userId: user.id, teamId: team.id },
        update: {},
      });
    }
  }
}
