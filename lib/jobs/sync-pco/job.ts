import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db"
import { fetchTeamsSnapshot } from "@/lib/pco"

export async function SyncPcoJob(): Promise<void> {
  console.log("Fetching PCO data...")

  const { people, serviceTypes, teams, leaders, positions, assignments } =
    await fetchTeamsSnapshot()

  console.log("Updating People")

  for (const person of people) {
    await prisma.person.upsert(person)
  }

  console.log("Updating Service Types")

  for (const serviceType of serviceTypes) {
    await prisma.serviceType.upsert(serviceType)
  }

  console.log("Updating Teams")

  for (const team of teams) {
    await prisma.team.upsert(team)
  }

  console.log("Updating Team Positions")

  for (const position of positions) {
    await prisma.position.upsert(position)
  }

  console.log("Updating Team Leaders")

  for (const leader of leaders) {
    try {
      await prisma.leader.upsert(leader)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025" &&
        error.message.includes(
          "An operation failed because it depends on one or more records that were required but not found."
        )
      ) {
        console.error(
          `${leader.where.personId_teamId?.personId}:${leader.where.personId_teamId?.teamId} is missing a person or team`
        )
        continue
      } else {
        throw error
      }
    }
  }

  console.log("Updating Person Team Position Assignments")

  for (const assignment of assignments) {
    await prisma.assignment.upsert(assignment)
  }
  console.log("PCO data synced successfully")
}
