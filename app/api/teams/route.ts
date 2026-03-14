import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { syncLeadersFromPCO } from "@/lib/jobs/sync-pco/sync-leaders"
import { syncMembersFromPCO } from "@/lib/jobs/sync-pco/sync-members"
import { fetchServiceType, fetchTeams } from "@/lib/pco"
import {
  getOrCreateServiceTypeByPcoId,
  getOrCreateTeamByPcoId,
} from "@/lib/user"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const serviceTypePcoId =
    searchParams.get("serviceTypeId") ?? env.PCO_SERVICE_TYPE_ID
  try {
    if (serviceTypePcoId) {
      const st = await fetchServiceType(serviceTypePcoId)
      const serviceType = await getOrCreateServiceTypeByPcoId(st.id, st.name)
      const pcoTeams = await fetchTeams(serviceTypePcoId)
      const teams = await Promise.all(
        pcoTeams.map((t) =>
          getOrCreateTeamByPcoId(t.id, t.name, serviceType.id)
        )
      )
      await syncLeadersFromPCO(serviceTypePcoId, teams)
      await syncMembersFromPCO(serviceTypePcoId, teams)
      return NextResponse.json(teams.map((t) => ({ id: t.id, name: t.name })))
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
