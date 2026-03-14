const PCO_API = "https://api.planningcenteronline.com";
const PCO_TOKEN_URL = `${PCO_API}/oauth/token`;

export interface PCOTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export async function exchangeRefreshToken(
  refreshToken: string
): Promise<PCOTokenResponse> {
  const clientId = process.env.PCO_CLIENT_ID;
  const clientSecret = process.env.PCO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PCO_CLIENT_ID and PCO_CLIENT_SECRET required");
  }
  const res = await fetch(PCO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PCO token refresh failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<PCOTokenResponse>;
}

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

interface PCOTeamLeaderItem {
  id: string;
  type: string;
  relationships?: { person?: { data?: { id?: string } } };
}

interface PCOTeamLeadersResponse {
  data: PCOTeamLeaderItem[];
}

export async function fetchTeamLeaders(
  accessToken: string,
  serviceTypeId: string,
  teamId: string
): Promise<{ personId: string }[]> {
  const path = `/services/v2/service_types/${serviceTypeId}/teams/${teamId}/team_leaders`;
  const json = await fetchPCOWithToken<PCOTeamLeadersResponse>(path, accessToken);
  const data = Array.isArray(json.data) ? json.data : [];
  return data
    .map((item) => {
      const personId = item.relationships?.person?.data?.id ?? item.id;
      return personId ? { personId } : null;
    })
    .filter((x): x is { personId: string } => Boolean(x));
}

interface PCOPersonAttributes {
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface PCOPersonItem {
  id: string;
  attributes?: PCOPersonAttributes;
}

interface PCOPersonResponse {
  data: PCOPersonItem;
}

export async function fetchPerson(
  accessToken: string,
  personId: string
): Promise<{ id: string; name: string; email?: string }> {
  const path = `/people/v2/people/${personId}`;
  const json = await fetchPCOWithToken<PCOPersonResponse>(path, accessToken);
  const d = json.data;
  const first = d?.attributes?.first_name ?? "";
  const last = d?.attributes?.last_name ?? "";
  const name = [first, last].filter(Boolean).join(" ") || undefined;
  return {
    id: d?.id ?? personId,
    name: name ?? "",
    email: d?.attributes?.email,
  };
}
