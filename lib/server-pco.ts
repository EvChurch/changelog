import { exchangeRefreshToken } from "@/lib/pco";

/**
 * Returns an access token for server-side PCO API calls (teams, leaders, people).
 * Uses only PCO_API_KEY (env). OAuth is not used for API; only for identity (visibility from cached data).
 */
export async function getServerPcoAccessToken(): Promise<string> {
  const apiKey = process.env.PCO_API_KEY;
  if (!apiKey) {
    throw new Error("No PCO API key. Set PCO_API_KEY in env.");
  }
  const tokens = await exchangeRefreshToken(apiKey);
  return tokens.access_token;
}
