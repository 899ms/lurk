import { writeProgress } from "@/jobs/enqueue";
import { clientForUser } from "@/lib/anyapi";
import type { FetchContext } from "@/lib/reddit/fetch";
import { fetchPost } from "@/lib/reddit/skus";
import type { StoredPost } from "@/lib/reddit/store";
import { loadScanProject, type ScanProject } from "@/lib/scan/project";
import { tierForUser } from "@/lib/tier";
import { competitorNamed } from "./competitors";
import { fetchKeywordVolumes, fetchRankingThreads } from "./fetch";
import { seoSettings } from "./limits";
import { writeOpportunities, type OpportunityRow } from "./opportunities";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SeoRefreshOutcome = {
  keywords: number;
  threads: number;
  costUsd: number;
};

/**
 * Opens one ranking thread so the page can show its score, replies and age.
 * A thread Reddit will not hand back is skipped: the rest of the keyword is
 * still worth showing.
 */
async function readThread(
  ctx: FetchContext,
  url: string,
  maxAgeMs: number,
): Promise<{ post: StoredPost | null; costUsd: number }> {
  try {
    const result = await fetchPost(ctx, url, maxAgeMs);
    return { post: result.value[0] ?? null, costUsd: result.costUsd };
  } catch {
    return { post: null, costUsd: 0 };
  }
}

async function refreshKeyword(
  project: ScanProject,
  ctx: FetchContext,
  keyword: string,
  maxAgeMs: number,
): Promise<{ threads: number; costUsd: number }> {
  const ranked = await fetchRankingThreads(ctx, keyword, maxAgeMs);
  let costUsd = ranked.costUsd;
  const rows: OpportunityRow[] = [];
  for (const result of ranked.value) {
    const thread = await readThread(ctx, result.url, maxAgeMs);
    costUsd += thread.costUsd;
    if (!thread.post) {
      continue;
    }
    rows.push({
      postId: thread.post.id,
      position: result.position,
      competitorPresent: competitorNamed(
        project.competitors,
        thread.post.title,
        thread.post.body,
      ),
    });
  }
  await writeOpportunities(project.id, keyword, rows);
  return { threads: rows.length, costUsd };
}

/**
 * One Reddit SEO refresh: for every keyword the tier allows, which Reddit
 * threads Google ranks, what each thread looks like now, and whether a
 * competitor is named in it. Monthly volume is bought once for the whole list
 * and only for a connected wallet, because that endpoint costs a hundred times
 * a Reddit call.
 */
export async function runSeoRefresh(
  projectId: string,
  jobId: string,
): Promise<SeoRefreshOutcome> {
  const project = await loadScanProject(projectId);
  if (!project) {
    throw new Error("This project no longer exists");
  }
  const { limits } = await tierForUser(project.userId);
  const settings = seoSettings(limits, project.keywords);
  const funded = await clientForUser(project.userId);
  const maxAgeMs = settings.refreshDays * DAY_MS;
  const ctx: FetchContext = { projectId, funded, maxAgeMs };

  let threads = 0;
  let costUsd = 0;
  for (const [index, keyword] of settings.keywords.entries()) {
    await writeProgress(jobId, `Searching ${index + 1} of ${settings.keywords.length}: ${keyword}`);
    const done = await refreshKeyword(project, ctx, keyword, maxAgeMs);
    threads += done.threads;
    costUsd += done.costUsd;
  }

  if (settings.searchVolume && settings.keywords.length > 0) {
    await writeProgress(jobId, "Reading monthly search volume");
    costUsd += await fetchKeywordVolumes(ctx, settings.keywords);
  }

  await writeProgress(jobId, "Finished");
  return { keywords: settings.keywords.length, threads, costUsd };
}
