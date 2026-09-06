import { and, avg, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  leads,
  painThemes,
  redditAuthors,
  redditComments,
  redditPosts,
  subreddits,
} from "@/db/schema";

/** How many faces a theme card shows before it stops. */
export const THEME_FACES = 5;

export type ThemeFace = { name: string | null; avatarUrl: string | null };

export type ThemeView = {
  id: string;
  label: string;
  summary: string | null;
  count: number;
  faces: ThemeFace[];
  generatedAt: Date;
};

export type CommunityRow = {
  name: string;
  iconUrl: string | null;
  leads: number;
  averageScore: number;
  promoPolicy: string | null;
  weeklyActiveUsers: number | null;
};

/** Who is behind a set of leads: the commenter when there is one, else the poster. */
async function facesFor(leadIds: string[]): Promise<Map<string, ThemeFace>> {
  if (leadIds.length === 0) {
    return new Map();
  }
  const rows = await db()
    .select({
      id: leads.id,
      postAuthor: redditPosts.author,
      commentAuthor: redditComments.author,
      avatarUrl: redditAuthors.avatarUrl,
    })
    .from(leads)
    .innerJoin(redditPosts, eq(redditPosts.id, leads.postId))
    .leftJoin(redditComments, eq(redditComments.id, leads.commentId))
    .leftJoin(
      redditAuthors,
      eq(
        redditAuthors.username,
        sql`lower(coalesce(${redditComments.author}, ${redditPosts.author}))`,
      ),
    )
    .where(inArray(leads.id, leadIds));
  return new Map(
    rows.map((row) => [
      row.id,
      { name: row.commentAuthor ?? row.postAuthor, avatarUrl: row.avatarUrl },
    ]),
  );
}

/** The stored themes with their faces, biggest theme first. */
export async function listThemes(projectId: string): Promise<ThemeView[]> {
  const rows = await db()
    .select()
    .from(painThemes)
    .where(eq(painThemes.projectId, projectId))
    .orderBy(desc(painThemes.generatedAt));
  const wanted = rows.flatMap((row) => (row.leadIds ?? []).slice(0, THEME_FACES));
  const faces = await facesFor(wanted);
  return rows
    .map((row) => ({
      id: row.id,
      label: row.label,
      summary: row.summary,
      count: (row.leadIds ?? []).length,
      faces: (row.leadIds ?? [])
        .slice(0, THEME_FACES)
        .map((id) => faces.get(id))
        .filter((face): face is ThemeFace => face !== undefined),
      generatedAt: row.generatedAt,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Where this project's leads come from, and what each community allows. */
export async function listCommunities(projectId: string): Promise<CommunityRow[]> {
  const rows = await db()
    .select({
      name: redditPosts.subreddit,
      iconUrl: subreddits.iconUrl,
      leads: count(),
      averageScore: avg(leads.score),
      promoPolicy: subreddits.promoPolicy,
      weeklyActiveUsers: subreddits.subscribers,
    })
    .from(leads)
    .innerJoin(redditPosts, eq(redditPosts.id, leads.postId))
    .leftJoin(subreddits, eq(subreddits.name, sql`lower(${redditPosts.subreddit})`))
    .where(and(eq(leads.projectId, projectId), inArray(leads.status, ["new", "hidden"])))
    .groupBy(
      redditPosts.subreddit,
      subreddits.iconUrl,
      subreddits.promoPolicy,
      subreddits.subscribers,
    );
  return rows
    .map((row) => ({
      name: row.name,
      iconUrl: row.iconUrl,
      leads: row.leads,
      averageScore: Math.round(Number(row.averageScore ?? 0)),
      promoPolicy: row.promoPolicy,
      weeklyActiveUsers: row.weeklyActiveUsers,
    }))
    .sort((a, b) => b.leads - a.leads);
}
