import { prisma } from "@/lib/db";

export async function getOrCreateUserByPcoId(
  pcoId: string,
  data: { email?: string | null; name?: string | null }
) {
  let user = await prisma.user.findUnique({ where: { pcoId } });
  if (user) {
    if (data.email !== undefined || data.name !== undefined) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(data.email !== undefined && { email: data.email }),
          ...(data.name !== undefined && { name: data.name }),
        },
      });
    }
    return user;
  }
  return prisma.user.create({
    data: {
      pcoId,
      email: data.email ?? null,
      name: data.name ?? null,
    },
  });
}

export async function getOrCreateTeamByPcoId(pcoTeamId: string, name: string) {
  const existing = await prisma.team.findUnique({
    where: { pcoTeamId },
  });
  if (existing) return existing;
  return prisma.team.create({
    data: { pcoTeamId, name },
  });
}
