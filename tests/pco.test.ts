import assert from "node:assert/strict"
import { afterEach, mock, test } from "node:test"

import { fetchTeamsSnapshot } from "../lib/pco"

// The HTTP boundary is always replaced; these tests never contact PCO.
afterEach(() => mock.restoreAll())

function team(id: string, people: unknown[] = []) {
  return {
    type: "Team",
    id,
    attributes: {
      name: `Team ${id}`,
      service_type: { id: "service", name: "Sunday" },
      people,
      team_positions: [{ id: `position-${id}`, name: "Singer", team: { id } }],
      person_team_position_assignments: [
        {
          id: `assignment-${id}`,
          person: { id: "person" },
          team_position: { id: `position-${id}` },
        },
      ],
      team_leaders: [
        { id: `leader-${id}`, team: { id }, person: { id: "person" } },
      ],
    },
  }
}

function response(data: unknown[]) {
  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/vnd.api+json" },
  })
}

test("shared people and service types are deduplicated while team relationships are preserved", async () => {
  const person = {
    id: "person",
    full_name: "Test Person",
    first_name: "Test",
    last_name: "Person",
  }
  mock.method(globalThis, "fetch", async () =>
    response([team("one", [person]), team("two", [person])])
  )
  const snapshot = await fetchTeamsSnapshot()
  assert.equal(snapshot.people.length, 1)
  assert.equal(snapshot.serviceTypes.length, 1)
  assert.equal(snapshot.teams.length, 2)
  assert.deepEqual(
    snapshot.positions.map((p) => p.create.team),
    [
      { connect: { remoteId_provider: { remoteId: "one", provider: "pco" } } },
      { connect: { remoteId_provider: { remoteId: "two", provider: "pco" } } },
    ]
  )
  assert.deepEqual(snapshot.assignments[1].create.position, {
    connect: {
      remoteId_provider: { remoteId: "position-two", provider: "pco" },
    },
  })
  assert.deepEqual(snapshot.leaders[1].create.person, {
    connect: { remoteId_provider: { remoteId: "person", provider: "pco" } },
  })
})

test("a full first page advances the offset and a short page finishes the snapshot", async () => {
  const paths: URL[] = []
  mock.method(globalThis, "fetch", async (url: string) => {
    paths.push(new URL(url))
    return response(
      paths.length === 1
        ? Array.from({ length: 25 }, (_, i) => team(String(i)))
        : [team("last")]
    )
  })
  const snapshot = await fetchTeamsSnapshot()
  assert.equal(snapshot.teams.length, 26)
  assert.equal(paths.length, 2)
  assert.equal(paths[0].searchParams.has("offset"), false)
  assert.equal(paths[1].searchParams.get("offset"), "25")
})

test("malformed upstream data fails instead of returning a partial sync snapshot", async () => {
  mock.method(globalThis, "fetch", async () =>
    response([{ type: "Team", id: "broken", attributes: { name: "Broken" } }])
  )
  await assert.rejects(fetchTeamsSnapshot(), /Invalid teams payload from PCO/)
})

test("upstream HTTP failures are surfaced for job retry", async () => {
  mock.method(
    globalThis,
    "fetch",
    async () => new Response("Unavailable", { status: 503 })
  )
  await assert.rejects(fetchTeamsSnapshot(), /PCO API 503: Unavailable/)
})
