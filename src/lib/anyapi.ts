import { AnyAPI } from "@getanyapi/sdk";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { walletConnections } from "@/db/schema";
import { config } from "./config";
import { decryptSecret, encryptSecret } from "./crypto";
import { refreshTokens } from "./oauth";

/** Who pays for a call: the operator's house key, or one user's AnyAPI wallet. */
export type Funding = "house" | `wallet:${string}`;

export type FundedClient = { client: AnyAPI; funding: Funding };

const EXPIRY_SKEW_MS = 60_000;

export async function walletConnection(userId: string) {
  const rows = await db()
    .select()
    .from(walletConnections)
    .where(eq(walletConnections.userId, userId));
  return rows[0] ?? null;
}

async function walletAccessToken(userId: string): Promise<string | null> {
  const row = await walletConnection(userId);
  if (!row) {
    return null;
  }
  const key = config().APP_ENCRYPTION_KEY;
  const fresh =
    row.accessToken &&
    row.accessTokenExpiresAt &&
    row.accessTokenExpiresAt.getTime() - EXPIRY_SKEW_MS > Date.now();
  if (fresh && row.accessToken) {
    return decryptSecret(row.accessToken, key);
  }
  const tokens = await refreshTokens(decryptSecret(row.refreshToken, key));
  await db()
    .update(walletConnections)
    .set({
      refreshToken: encryptSecret(tokens.refresh_token, key),
      accessToken: encryptSecret(tokens.access_token, key),
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
    })
    .where(eq(walletConnections.userId, userId));
  return tokens.access_token;
}

/** Store a freshly issued token pair for a user, encrypting both secrets. */
export async function saveWalletTokens(
  userId: string,
  tokens: { access_token: string; refresh_token: string; expires_in: number; scope: string },
) {
  const key = config().APP_ENCRYPTION_KEY;
  const values = {
    userId,
    refreshToken: encryptSecret(tokens.refresh_token, key),
    accessToken: encryptSecret(tokens.access_token, key),
    accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    scope: tokens.scope,
    connectedAt: new Date(),
  };
  await db()
    .insert(walletConnections)
    .values(values)
    .onConflictDoUpdate({ target: walletConnections.userId, set: values });
}

/**
 * An SDK client for this user: their wallet when connected, the house key
 * otherwise. `funding` is what a scan writes into search_runs.funded_by.
 */
export async function clientForUser(userId: string): Promise<FundedClient> {
  const { ANYAPI_BASE_URL, ANYAPI_HOUSE_API_KEY } = config();
  const walletToken = await walletAccessToken(userId);
  if (walletToken) {
    return {
      client: new AnyAPI({ apiKey: walletToken, baseUrl: ANYAPI_BASE_URL }),
      funding: `wallet:${userId}`,
    };
  }
  if (!ANYAPI_HOUSE_API_KEY) {
    throw new Error("No wallet connected and ANYAPI_HOUSE_API_KEY is not set");
  }
  return {
    client: new AnyAPI({ apiKey: ANYAPI_HOUSE_API_KEY, baseUrl: ANYAPI_BASE_URL }),
    funding: "house",
  };
}
