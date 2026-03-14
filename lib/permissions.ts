import { prisma } from "@/lib/db"

export async function isEligibleDriverForTeam(
  personId: string,
  teamId: string
) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { serviceTypeId: true },
  })
  if (!team?.serviceTypeId) return false
  const driver = await prisma.driver.findUnique({
    where: {
      personId_serviceTypeId: {
        personId,
        serviceTypeId: team.serviceTypeId,
      },
    },
  })
  return Boolean(driver)
}

export async function leaderOrDriverWrite(personId: string, teamId: string) {
  const [leader, driver] = await Promise.all([
    prisma.leader.findUnique({
      where: {
        personId_teamId: {
          personId,
          teamId,
        },
      },
    }),
    isEligibleDriverForTeam(personId, teamId),
  ])
  return Boolean(leader || driver)
}

export async function memberOrDriverWrite(personId: string, teamId: string) {
  const [leader, assignment, driver] = await Promise.all([
    prisma.leader.findUnique({
      where: {
        personId_teamId: {
          personId,
          teamId,
        },
      },
    }),
    prisma.assignment.findFirst({
      where: {
        personId,
        position: { teamId },
      },
      select: { id: true },
    }),
    isEligibleDriverForTeam(personId, teamId),
  ])

  return Boolean(leader || assignment || driver)
}

export async function canViewTeam(personId: string, teamId: string) {
  const [leader, assignment] = await Promise.all([
    prisma.leader.findUnique({
      where: {
        personId_teamId: {
          personId,
          teamId,
        },
      },
    }),
    prisma.assignment.findFirst({
      where: {
        personId,
        position: { teamId },
      },
      select: { id: true },
    }),
  ])
  return Boolean(leader || assignment)
}

export async function isPersonAssignedToTeam(personId: string, teamId: string) {
  const assignment = await prisma.assignment.findFirst({
    where: {
      personId,
      position: { teamId },
    },
    select: { id: true },
  })
  return Boolean(assignment)
}

export async function isPersonInTeam(personId: string, teamId: string) {
  const [leader, assignment] = await Promise.all([
    prisma.leader.findUnique({
      where: {
        personId_teamId: {
          personId,
          teamId,
        },
      },
      select: { id: true },
    }),
    prisma.assignment.findFirst({
      where: {
        personId,
        position: { teamId },
      },
      select: { id: true },
    }),
  ])
  return Boolean(leader || assignment)
}
