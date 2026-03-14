import { prisma } from "@/lib/db"

type PersonSeed = {
  email?: string | null
  fullName?: string | null
  firstName?: string | null
  lastName?: string | null
}

function normalizeName(seed: PersonSeed, pcoId: string) {
  const fullName =
    seed.fullName?.trim() ||
    seed.email?.trim() ||
    seed.firstName?.trim() ||
    pcoId
  const firstName =
    seed.firstName?.trim() || fullName.split(/\s+/)[0] || fullName
  const lastName =
    seed.lastName?.trim() || fullName.split(/\s+/).slice(1).join(" ").trim()
  return { fullName, firstName, lastName }
}

export async function getOrCreatePersonByPcoId(
  pcoId: string,
  seed: PersonSeed = {}
) {
  const name = normalizeName(seed, pcoId)
  return prisma.person.upsert({
    where: { remoteId_provider: { remoteId: pcoId, provider: "pco" } },
    create: {
      remoteId: pcoId,
      provider: "pco",
      email: seed.email ?? null,
      fullName: name.fullName,
      firstName: name.firstName,
      lastName: name.lastName,
    },
    update: {
      email: seed.email ?? undefined,
      ...(seed.fullName !== undefined ||
      seed.firstName !== undefined ||
      seed.lastName !== undefined
        ? {
            fullName: name.fullName,
            firstName: name.firstName,
            lastName: name.lastName,
          }
        : {}),
    },
  })
}

export async function getOrCreateServiceTypeByPcoId(id: string, name: string) {
  return prisma.serviceType.upsert({
    where: { remoteId_provider: { remoteId: id, provider: "pco" } },
    create: { remoteId: id, provider: "pco", name },
    update: { name },
  })
}

export async function getOrCreateTeamByPcoId(
  id: string,
  name: string,
  serviceTypeId?: string | null
) {
  return prisma.team.upsert({
    where: { remoteId_provider: { remoteId: id, provider: "pco" } },
    create: {
      remoteId: id,
      provider: "pco",
      name,
      serviceTypeId: serviceTypeId ?? null,
    },
    update: { name, serviceTypeId: serviceTypeId ?? null },
  })
}

export async function getOrCreateDefaultPosition(teamId: string) {
  const remoteId = `${teamId}:member`
  return prisma.position.upsert({
    where: { remoteId_provider: { remoteId, provider: "pco" } },
    create: { remoteId, provider: "pco", teamId, name: "Member" },
    update: {},
  })
}

export const getOrCreateDefaultTeamPosition = getOrCreateDefaultPosition
