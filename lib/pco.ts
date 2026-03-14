const PCO_API = "https://api.planningcenteronline.com";

export async function fetchPCOWithToken<T>(
  path: string,
  accessToken: string
): Promise<T> {
  const res = await fetch(`${PCO_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PCO API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

interface PCOTeamItem {
  id: string;
  type: string;
  attributes?: { name?: string };
}

interface PCOTeamsResponse {
  data: PCOTeamItem[];
  meta?: { next?: { offset: string } };
}

export async function fetchTeams(
  accessToken: string,
  serviceTypeId: string
): Promise<{ id: string; name: string }[]> {
  const path = `/services/v2/service_types/${serviceTypeId}/teams`;
  const json = await fetchPCOWithToken<PCOTeamsResponse>(path, accessToken);
  const data = Array.isArray(json.data) ? json.data : [];
  return data.map((t) => ({
    id: t.id,
    name: t.attributes?.name ?? t.id,
  }));
}
