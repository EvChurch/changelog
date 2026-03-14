import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOrCreatePersonByPcoId } from "@/lib/person"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const person = await getOrCreatePersonByPcoId(session.user.id, {
    email: session.user.email ?? undefined,
    fullName: session.user.name ?? undefined,
  })

  const drivers = await prisma.driver.findMany({
    where: { personId: person.id },
    select: { serviceTypeId: true },
  })
  const driverServiceTypeIds = drivers.map((driver) => driver.serviceTypeId)

  const teams = await prisma.team.findMany({
    where: {
      OR: [
        { leaders: { some: { personId: person.id } } },
        {
          positions: {
            some: { assignments: { some: { personId: person.id } } },
          },
        },
        ...(driverServiceTypeIds.length > 0
          ? [{ serviceTypeId: { in: driverServiceTypeIds } }]
          : []),
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(teams)
}
