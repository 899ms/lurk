import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { seoOpportunities } from "@/db/schema";

/** One Reddit thread ranking for one keyword, as a refresh found it. */
export type OpportunityRow = {
  postId: string;
  position: number;
  competitorPresent: boolean;
};

/**
 * Replaces this keyword's rankings with what the refresh just saw. A thread
 * Google has dropped should leave the page, so the keyword's rows are rewritten
 * rather than merged.
 */
export async function writeOpportunities(
  projectId: string,
  keyword: string,
  rows: OpportunityRow[],
): Promise<number> {
  await db()
    .delete(seoOpportunities)
    .where(
      and(eq(seoOpportunities.projectId, projectId), eq(seoOpportunities.keyword, keyword)),
    );
  if (rows.length === 0) {
    return 0;
  }
  const written = await db()
    .insert(seoOpportunities)
    .values(
      rows.map((row) => ({
        projectId,
        keyword,
        postId: row.postId,
        position: row.position,
        competitorPresent: row.competitorPresent,
        refreshedAt: new Date(),
      })),
    )
    .returning({ id: seoOpportunities.id });
  return written.length;
}
