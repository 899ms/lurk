"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { walletConnections } from "@/db/schema";
import { requireLocalUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { decryptSecret } from "@/lib/crypto";
import { revokeToken } from "@/lib/oauth";

/** Deletes the stored connection, telling AnyAPI to revoke it best effort. */
export async function disconnectWalletAction() {
  const user = await requireLocalUser();
  const rows = await db()
    .select()
    .from(walletConnections)
    .where(eq(walletConnections.userId, user.id));
  const row = rows[0];
  if (row) {
    await revokeToken(decryptSecret(row.refreshToken, config().APP_ENCRYPTION_KEY));
    await db().delete(walletConnections).where(eq(walletConnections.userId, user.id));
  }
  revalidatePath("/app/settings");
}
