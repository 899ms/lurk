"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { walletConnections } from "@/db/schema";
import { requireLocalUser } from "@/lib/auth";
import { createProject } from "@/lib/projects";
import { config } from "@/lib/config";
import { decryptSecret } from "@/lib/crypto";
import { revokeToken } from "@/lib/oauth";

export async function createProjectAction(formData: FormData) {
  const user = await requireLocalUser();
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!name) {
    throw new Error("A project needs a name");
  }
  await createProject(user.id, name, url || null);
  revalidatePath("/app", "layout");
}

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
