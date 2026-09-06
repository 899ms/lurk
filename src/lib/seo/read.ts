import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  keywordVolumes,
  redditPosts,
  seoOpportunities,
  subreddits,
} from "@/db/schema";
import { normalizeQuery } from "@/lib/reddit/fetch";

export type SeoRow = Awaited<ReturnType<typeof listOpportunities>>[number];

export type SeoFilter = { keyword?: string; subreddit?: string; competitor?: string };

/** What one Google search cost this project, for the cost line on its threads. */

export type SeoFacets = { keywords: string[]; subreddits: string[] };

const columns = {
  id: seoOpportunities.id,
  keyword: seoOpportunities.keyword,
  position: seoOpportunities.position,
  competitorPresent: seoOpportunities.competitorPresent,
  refreshedAt: seoOpportunities.refreshedAt,
  postId: redditPosts.id,
  title: redditPosts.title,
  url: redditPosts.url,
  subreddit: redditPosts.subreddit,
  subredditIconUrl: subreddits.iconUrl,
  score: redditPosts.score,
  numComments: redditPosts.numComments,
  createdAt: redditPosts.createdAt,
};

/** Every ranking thread this project holds, keyword by keyword, best rank first. */
export async function listOpportunities(projectId: string, filter: SeoFilter) {
  return db()
    .select(columns)
    .from(seoOpportunities)
    .innerJoin(redditPosts, eq(redditPosts.id, seoOpportunities.postId))
    .leftJoin(subreddits, eq(subreddits.name, sql`lower(${redditPosts.subreddit})`))
    .where(
      and(
        eq(seoOpportunities.projectId, projectId),
        filter.keyword ? eq(seoOpportunities.keyword, filter.keyword) : undefined,
        filter.subreddit ? eq(sql`lower(${redditPosts.subreddit})`, filter.subreddit) : undefined,
        filter.competitor === "yes" ? eq(seoOpportunities.competitorPresent, true) : undefined,
        filter.competitor === "no" ? eq(seoOpportunities.competitorPresent, false) : undefined,
      ),
    )
    .orderBy(asc(seoOpportunities.keyword), asc(seoOpportunities.position));
}

/** The keywords and communities the filter pills can actually offer. */
export async function seoFacets(projectId: string): Promise<SeoFacets> {
  const rows = await db()
    .select({ keyword: seoOpportunities.keyword, subreddit: redditPosts.subreddit })
    .from(seoOpportunities)
    .innerJoin(redditPosts, eq(redditPosts.id, seoOpportunities.postId))
    .where(eq(seoOpportunities.projectId, projectId));
  return {
    keywords: [...new Set(rows.map((row) => row.keyword))].sort(),
    subreddits: [...new Set(rows.map((row) => row.subreddit))].sort(),
  };
}

/** The most recent monthly volume held for each keyword, when one was bought. */
export async function volumesFor(keywords: string[]): Promise<Map<string, number>> {
  if (keywords.length === 0) {
    return new Map();
  }
  const rows = await db()
    .select({
      keyword: keywordVolumes.keyword,
      monthlyVolume: keywordVolumes.monthlyVolume,
    })
    .from(keywordVolumes)
    .where(inArray(keywordVolumes.keyword, keywords.map(normalizeQuery)))
    .orderBy(desc(keywordVolumes.fetchedAt));
  const byKeyword = new Map<string, number>();
  for (const row of rows) {
    if (!byKeyword.has(row.keyword) && row.monthlyVolume !== null) {
      byKeyword.set(row.keyword, row.monthlyVolume);
    }
  }
  return byKeyword;
}

