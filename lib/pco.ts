import { z } from "zod"

import { env } from "@/lib/env"

const PCO_API = "https://api.planningcenteronline.com"

async function fetchPCO(path: string): Promise<unknown> {
  const res = await fetch(`${PCO_API}${path}`, {
    headers: { Authorization: `Bearer ${env.PCO_API_KEY}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PCO API ${res.status}: ${text}`)
  }
  return res.json()
}

const pcoMetaNext = z.object({ offset: z.string() })
const pcoMeta = z.object({ next: pcoMetaNext.optional() }).optional()

const pcoResourceAttributesName = z.object({ name: z.string() })
const pcoServiceTypeItem = z.object({
  id: z.string(),
  type: z.string(),
  attributes: pcoResourceAttributesName.optional(),
})
const pcoServiceTypeResponse = z.object({
  data: pcoServiceTypeItem,
  meta: pcoMeta,
})
const pcoServiceTypesResponse = z.object({
  data: z.array(pcoServiceTypeItem),
  meta: pcoMeta,
})

const pcoTeamItem = z.object({
  id: z.string(),
  type: z.string(),
  attributes: pcoResourceAttributesName.optional(),
})
const pcoTeamsResponse = z.object({
  data: z.array(pcoTeamItem),
  meta: pcoMeta,
})

const pcoTeamLeaderPersonData = z.object({ id: z.string() })
const pcoTeamLeaderItem = z.object({
  id: z.string(),
  type: z.string(),
  relationships: z
    .object({
      person: z.object({ data: pcoTeamLeaderPersonData }).optional(),
    })
    .optional(),
})
const pcoTeamLeadersResponse = z.object({
  data: z.array(pcoTeamLeaderItem),
})

const pcoPositionItem = z.object({
  id: z.string(),
  type: z.string(),
})
const pcoPositionsResponse = z.object({
  data: z.array(pcoPositionItem),
})

const pcoAssignmentPersonData = z.object({ id: z.string() })
const pcoAssignmentItem = z.object({
  id: z.string(),
  type: z.string(),
  relationships: z
    .object({
      person: z.object({ data: pcoAssignmentPersonData }).optional(),
    })
    .optional(),
})
const pcoAssignmentsResponse = z.object({
  data: z.array(pcoAssignmentItem),
})

const pcoPersonAttributes = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
})
const pcoPersonItem = z.object({
  id: z.string(),
  type: z.string(),
  attributes: pcoPersonAttributes.optional(),
})
const pcoPersonResponse = z.object({
  data: pcoPersonItem,
})

export async function fetchServiceType(
  serviceTypeId: string
): Promise<{ id: string; name: string }> {
  const json = await fetchPCO(`/services/v2/service_types/${serviceTypeId}`)
  const parsed = pcoServiceTypeResponse.parse(json)
  const d = parsed.data
  return {
    id: d.id,
    name: d.attributes?.name ?? d.id,
  }
}

export async function fetchServiceTypes(): Promise<
  { id: string; name: string }[]
> {
  const out: { id: string; name: string }[] = []
  let offset: string | undefined
  do {
    const url = offset
      ? `/services/v2/service_types?offset=${offset}`
      : "/services/v2/service_types"
    const json = await fetchPCO(url)
    const parsed = pcoServiceTypesResponse.parse(json)
    for (const t of parsed.data) {
      out.push({ id: t.id, name: t.attributes?.name ?? t.id })
    }
    offset = parsed.meta?.next?.offset
  } while (offset)
  return out
}

export async function fetchTeams(
  serviceTypeId: string
): Promise<{ id: string; name: string }[]> {
  const out: { id: string; name: string }[] = []
  const path = `/services/v2/service_types/${serviceTypeId}/teams`
  let offset: string | undefined
  do {
    const url = offset ? `${path}?offset=${offset}` : path
    const json = await fetchPCO(url)
    const parsed = pcoTeamsResponse.parse(json)
    for (const t of parsed.data) {
      out.push({ id: t.id, name: t.attributes?.name ?? t.id })
    }
    offset = parsed.meta?.next?.offset
  } while (offset)
  return out
}

export async function fetchTeamLeaders(
  serviceTypeId: string,
  teamId: string
): Promise<{ personId: string }[]> {
  const path = `/services/v2/service_types/${serviceTypeId}/teams/${teamId}/team_leaders`
  const json = await fetchPCO(path)
  const parsed = pcoTeamLeadersResponse.parse(json)
  const result: { personId: string }[] = []
  for (const item of parsed.data) {
    const personId = item.relationships?.person?.data?.id ?? item.id
    result.push({ personId })
  }
  return result
}

export async function fetchTeamMemberPersonIds(
  serviceTypeId: string,
  teamId: string
): Promise<string[]> {
  const positionPath = `/services/v2/service_types/${serviceTypeId}/teams/${teamId}/team_positions`
  const positionsJson = await fetchPCO(positionPath)
  const positionsParsed = pcoPositionsResponse.parse(positionsJson)
  const personIds = new Set<string>()
  for (const pos of positionsParsed.data) {
    const assignPath = `${positionPath}/${pos.id}/person_team_position_assignments`
    const assignJson = await fetchPCO(assignPath)
    const assignParsed = pcoAssignmentsResponse.parse(assignJson)
    for (const a of assignParsed.data) {
      const id = a.relationships?.person?.data?.id ?? a.id
      personIds.add(id)
    }
  }
  return [...personIds]
}

export async function fetchPerson(
  personId: string
): Promise<{ id: string; name: string; email: string | undefined }> {
  const path = `/people/v2/people/${personId}`
  const json = await fetchPCO(path)
  const parsed = pcoPersonResponse.parse(json)
  const d = parsed.data
  const first = d.attributes?.first_name ?? ""
  const last = d.attributes?.last_name ?? ""
  const name = [first, last].filter(Boolean).join(" ") || ""
  return {
    id: d.id,
    name,
    email: d.attributes?.email,
  }
}
