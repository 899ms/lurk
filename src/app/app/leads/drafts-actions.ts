"use server";

import { requireLocalUser } from "@/lib/auth";
import { generateDraft } from "@/lib/drafts/generate";
import { isDraftKind, isDraftMode } from "@/lib/drafts/policy";
import { projectForUser } from "@/lib/projects";

export type DraftResult = { ok: true; text: string } | { ok: false; message: string };

/**
 * Writes one reply for a lead the caller owns. Refusals, including a subreddit
 * that bans self-promotion, come back as a sentence the panel can show.
 */
export async function generateDraftAction(
  projectId: string,
  leadId: string,
  kind: string,
  mode: string,
): Promise<DraftResult> {
  if (!isDraftKind(kind) || !isDraftMode(mode)) {
    return { ok: false, message: "Pick a comment or a message, and a starter or a comparison." };
  }
  const user = await requireLocalUser();
  if (!(await projectForUser(user.id, projectId))) {
    return { ok: false, message: "That project is not yours" };
  }
  try {
    const draft = await generateDraft(projectId, leadId, kind, mode);
    return { ok: true, text: draft.text };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not write that." };
  }
}
