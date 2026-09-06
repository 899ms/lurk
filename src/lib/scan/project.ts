import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projectCompetitors, projectKeywords, projectSubreddits, projects } from "@/db/schema";
import { DEFAULT_SCORE_THRESHOLD } from "./constants";

export type ScanProject = {
  id: string;
  userId: string;
  name: string;
  threshold: number;
  /** The version of the product facts below; a verdict is only reusable for it. */
  profileVersion: number;
  keywords: string[];
  subreddits: string[];
  competitors: string[];
  productText: string;
};

function productText(row: typeof projects.$inferSelect, competitors: string[]): string {
  return [
    `Product: ${row.name}`,
    row.url ? `Website: ${row.url}` : "",
    row.pain ? `Pain it solves: ${row.pain}` : "",
    row.solution ? `What it does: ${row.solution}` : "",
    row.targetUsers ? `Who buys it: ${row.targetUsers}` : "",
    row.geography ? `Sells in: ${row.geography}` : "",
    row.budgetFit ? `Budget: ${row.budgetFit}` : "",
    competitors.length > 0 ? `Competitors: ${competitors.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Everything one scan needs about a project, read once. */
export async function loadScanProject(projectId: string): Promise<ScanProject | null> {
  const rows = await db().select().from(projects).where(eq(projects.id, projectId));
  const row = rows[0];
  if (!row) {
    return null;
  }
  const [keywords, subs, competitors] = await Promise.all([
    db().select().from(projectKeywords).where(eq(projectKeywords.projectId, projectId)),
    db().select().from(projectSubreddits).where(eq(projectSubreddits.projectId, projectId)),
    db().select().from(projectCompetitors).where(eq(projectCompetitors.projectId, projectId)),
  ]);
  const competitorNames = competitors.map((item) => item.name);
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    threshold: row.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD,
    profileVersion: row.profileVersion,
    keywords: keywords.map((item) => item.keyword),
    subreddits: subs.map((item) => item.name),
    competitors: competitorNames,
    productText: productText(row, competitorNames),
  };
}
