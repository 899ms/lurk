import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";

export type LeadRow = {
  projectId: string;
  postId: string;
  commentId: string | null;
  score: number;
  fit: number;
  intent: number;
  engagement: number;
  stage: string;
  reason: string;
  matchedPhrase: string;
};

/** One lead per project per post, or per project per comment. */
export function leadKey(postId: string, commentId: string | null): string {
  return commentId ? `comment:${commentId}` : `post:${postId}`;
}

/** Drops candidates a project already holds a lead for. */
export function withoutKnownLeads<T extends { postId: string; commentId?: string | null }>(
  known: Set<string>,
  candidates: T[],
): T[] {
  const seen = new Set(known);
  const out: T[] = [];
  for (const candidate of candidates) {
    const key = leadKey(candidate.postId, candidate.commentId ?? null);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(candidate);
    }
  }
  return out;
}

/** Every post and comment this project has already judged. */
export async function knownLeadKeys(projectId: string): Promise<Set<string>> {
  const rows = await db()
    .select({ postId: leads.postId, commentId: leads.commentId })
    .from(leads)
    .where(eq(leads.projectId, projectId));
  return new Set(rows.map((row) => leadKey(row.postId ?? "", row.commentId)));
}

/**
 * Writes the scan's keepers. The two partial unique indexes on leads make a
 * repeat harmless even when two scans race, so a duplicate is dropped rather
 * than overwriting a judgement the user may already have acted on.
 */
export async function writeLeads(rows: LeadRow[]): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }
  const written = await db()
    .insert(leads)
    .values(rows.map((row) => ({ ...row, scoredAt: new Date() })))
    .onConflictDoNothing()
    .returning({ id: leads.id });
  return written.length;
}
