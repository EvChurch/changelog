import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { fetchTeamsSnapshot } from "@/lib/pco"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const serviceTypePcoId = searchParams.get("serviceTypeId")
  try {
    if (serviceTypePcoId) {
      const snapshot = await fetchTeamsSnapshot()
      const filteredServiceTypes = snapshot.serviceTypes.filter(
        (st) => st.where.id === serviceTypePcoId
      )
      const filteredTeams = snapshot.teams.filter(
        (team) =>
          team.create.serviceType?.connect?.id === serviceTypePcoId ||
          team.update.serviceType?.connect?.id === serviceTypePcoId
      )

      for (const person of snapshot.people) {
        await prisma.person.upsert(person)
      }
      for (const st of filteredServiceTypes) {
        await prisma.serviceType.upsert(st)
      }
      const teams = await Promise.all(
        filteredTeams.map((t) => prisma.team.upsert(t))
      )
      return NextResponse.json(
        teams.map((team) => ({ id: team.id, name: team.name }))
      )
    }
    const teams = await prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(teams)
  } catch (e) {
    console.error("PCO teams fetch error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch teams" },
      { status: 502 }
    )
  }
}
