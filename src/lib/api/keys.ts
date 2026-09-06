import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { apiKeyNames } from "@/db/schema/api";

/** Every key starts with this, so one is recognizable in a log or a paste. */
export const KEY_PREFIX = "rl_sk_";

/** How much of a key is kept in the clear for the settings table. */
export const PREFIX_LENGTH = 12;

export type ApiKeyRow = typeof apiKeys.$inferSelect;

export type ListedApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
};

export function generateApiKey(): string {
  return `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

/** SHA-256 hex. The only form of a key that is ever stored. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function displayPrefix(key: string): string {
  return key.slice(0, PREFIX_LENGTH);
}

/** Mints a key, stores its hash and name, and hands the secret back once. */
export async function createApiKey(
  userId: string,
  name: string,
): Promise<{ key: string; id: string }> {
  const key = generateApiKey();
  const rows = await db()
    .insert(apiKeys)
    .values({ userId, hash: hashApiKey(key), prefix: displayPrefix(key), scopes: ["read"] })
    .returning({ id: apiKeys.id });
  const id = rows[0]?.id;
  if (!id) {
    throw new Error("Could not store the new API key");
  }
  await db().insert(apiKeyNames).values({ keyId: id, name });
  return { key, id };
}

export async function listApiKeys(userId: string): Promise<ListedApiKey[]> {
  const rows = await db()
    .select({
      id: apiKeys.id,
      name: apiKeyNames.name,
      prefix: apiKeys.prefix,
      scopes: apiKeys.scopes,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .leftJoin(apiKeyNames, eq(apiKeyNames.keyId, apiKeys.id))
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
  return rows.map((row) => ({
    ...row,
    name: row.name ?? "Unnamed key",
    scopes: row.scopes ?? [],
  }));
}

export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  await db()
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
}

/** The stored key behind a presented secret, or null when there is none. */
export async function findApiKey(presented: string): Promise<ApiKeyRow | null> {
  if (!presented.startsWith(KEY_PREFIX)) {
    return null;
  }
  const rows = await db().select().from(apiKeys).where(eq(apiKeys.hash, hashApiKey(presented)));
  return rows[0] ?? null;
}

export async function touchApiKey(keyId: string): Promise<void> {
  await db().update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyId));
}
