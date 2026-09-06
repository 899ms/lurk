import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  drafts,
  leads,
  projects,
  redditComments,
  redditPosts,
  subreddits,
} from "@/db/schema";
import { generateStructured } from "@/lib/llm";
import { composeDraft } from "./compose";
import type { DraftKind, DraftMode } from "./policy";
import type { DraftContext } from "./prompt";

export type Draft = typeof drafts.$inferSelect;

const replySchema = z.object({ text: z.string() });

/** The product and the post behind one lead, or null when it is not this project's. */
export async function draftContext(
  projectId: string,
  leadId: string,
): Promise<DraftContext | null> {
  const rows = await db()
    .select({
      name: projects.name,
      url: projects.url,
      pain: projects.pain,
      solution: projects.solution,
      targetUsers: projects.targetUsers,
      voiceProfile: projects.voiceProfile,
      title: redditPosts.title,
      postBody: redditPosts.body,
      subreddit: redditPosts.subreddit,
      postAuthor: redditPosts.author,
      promoPolicy: subreddits.promoPolicy,
      commentId: leads.commentId,
      commentBody: redditComments.body,
      commentAuthor: redditComments.author,
      matchedPhrase: leads.matchedPhrase,
      reason: leads.reason,
      stage: leads.stage,
    })
    .from(leads)
    .innerJoin(projects, eq(projects.id, leads.projectId))
    .innerJoin(redditPosts, eq(redditPosts.id, leads.postId))
    .leftJoin(redditComments, eq(redditComments.id, leads.commentId))
    .leftJoin(subreddits, eq(subreddits.name, sql`lower(${redditPosts.subreddit})`))
    .where(and(eq(leads.id, leadId), eq(leads.projectId, projectId)));
  const row = rows[0];
  if (!row) {
    return null;
  }
  return {
    product: {
      name: row.name,
      url: row.url,
      pain: row.pain,
      solution: row.solution,
      targetUsers: row.targetUsers,
      voiceProfile: row.voiceProfile,
    },
    lead: {
      title: row.title,
      body: row.commentId ? row.commentBody : row.postBody,
      subreddit: row.subreddit,
      promoPolicy: row.promoPolicy,
      author: row.commentId ? row.commentAuthor : row.postAuthor,
      matchedPhrase: row.matchedPhrase,
      reason: row.reason,
      stage: row.stage,
      isComment: row.commentId !== null,
    },
  };
}

/** Writes one reply through the shared language model client and stores it. */
export async function generateDraft(
  projectId: string,
  leadId: string,
  kind: DraftKind,
  mode: DraftMode,
): Promise<Draft> {
  const context = await draftContext(projectId, leadId);
  if (!context) {
    throw new Error("That lead is not in this project");
  }
  const text = await composeDraft(context, kind, mode, async (system, prompt) => {
    const reply = await generateStructured({
      purpose: "draft",
      projectId,
      schema: replySchema,
      system,
      prompt,
    });
    return reply.text;
  });
  const rows = await db().insert(drafts).values({ leadId, kind, mode, text }).returning();
  return rows[0];
}
