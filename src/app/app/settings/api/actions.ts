"use server";

import { revalidatePath } from "next/cache";
import { createApiKey, revokeApiKey } from "@/lib/api/keys";
import { requireLocalUser } from "@/lib/auth";

export type CreateKeyState = { key: string | null; error: string | null };

const PATH = "/app/settings/api";

/**
 * Mints a key and hands the secret back exactly once. Nothing stores it, so
 * the value in this state object is the only copy the user will ever see.
 */
export async function createApiKeyAction(
  _previous: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  const user = await requireLocalUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { key: null, error: "Give the key a name so you can tell it apart later." };
  }
  const { key } = await createApiKey(user.id, name);
  revalidatePath(PATH);
  return { key, error: null };
}

export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const user = await requireLocalUser();
  const keyId = String(formData.get("keyId") ?? "");
  if (keyId) {
    await revokeApiKey(user.id, keyId);
  }
  revalidatePath(PATH);
}
