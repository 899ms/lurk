import { writeProgress } from "@/jobs/enqueue";
import { clientForUser } from "@/lib/anyapi";
import type { FetchContext } from "@/lib/reddit/fetch";
import { fetchSearch } from "@/lib/reddit/skus";
import { asRawPost, upsertPosts, type StoredPost } from "@/lib/reddit/store";
import { scanIntervalHours, tierForUser } from "@/lib/tier";
import { constraintQueries } from "@/lib/discovery/rank";
import { retrieved, type PlanRow } from "./coverage";
import { loadEvaluations, writeEvaluations } from "./evaluations";
import { writeLeads } from "./leads";
import { loadScanProject, type ScanProject } from "./project";
import { evaluationsFor, postItem, routed, toLead, unjudged } from "./run";
import { judgeItems, readOrder, triageTitles } from "./score";
import { creditSources, markCovered, recordSources, type CandidateSource } from "./sources";

/**
 * The one-time sweep a new project starts with. A scan polls the last thirty
 * days; this asks Reddit's own search for a year of the problem's language, in
 * both orders it can be sorted, and keeps everything it finds however old it
 * is, because a person who asked eleven months ago is still the person a
 * founder wants to answer. There is no reading gate and no `reddit.post` call
 * here: search now carries the body, and the reading costs more than judging
 * the same post twice would. It never writes `seo_opportunities` either, which
 * is what keeps the Reddit SEO tab a Google-only list.
 */

const HOUR_MS = 60 * 60 * 1000;

/** Both orders one query can be read in; see fetchSearch on why both are bought. */
const SORTS = ["relevance", "new"] as const;

export type BackfillOutcome = {
  /** Query and sort pairs walked. */
  walks: number;
  /** Distinct posts the sweep found. */
  found: number;
  /** Posts this project had no verdict on, so this sweep judged them. */
  judged: number;
  /** Leads written, of either kind. */
  leads: number;
};

/** One query, as it is asked and what plan rows it credits. */
type Query = { text: string; rows: PlanRow[] };

/**
 * The whole of one query in one order, page after page. The walk stops when a
 * page carries no post id the walk has not already seen, which is what Reddit
 * does at the end of a result set, and when there is no cursor to follow. There
 * is no page cap: a year of one phrasing is what the sweep is for.
 */
async function walk(
  ctx: FetchContext,
  query: Query,
  sort: (typeof SORTS)[number],
  found: Map<string, StoredPost>,
  sources: Map<string, CandidateSource[]>,
): Promise<void> {
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (;;) {
    const result = await fetchSearch(ctx, query.text, {
      timeframe: "year",
      sort,
      ...(cursor ? { cursor } : {}),
    });
    let fresh = 0;
    for (const post of result.value.posts) {
      if (!seen.has(post.id)) {
        seen.add(post.id);
        fresh += 1;
      }
      found.set(post.id, post);
      const held = sources.get(post.id) ?? [];
      held.push({ kind: "search", key: query.text, rows: query.rows });
      sources.set(post.id, held);
    }
    cursor = result.value.nextCursor ?? undefined;
    if (fresh === 0 || !cursor) {
      return;
    }
  }
}

/**
 * Everything this project knows how to ask: each keyword row split into one
 * search per constraint, so no single constraint's posts are lost behind a
 * bounded listing (see `constraintQueries`), and each phrasing of the problem
 * as plain words. Measured 2026-09-10: a quoted phrasing returned nothing,
 * because a buyer rarely types the profile's exact sentence.
 */
function queriesOf(project: ScanProject): Query[] {
  const rows = retrieved(project.queries);
  return [
    ...rows.flatMap((row) => constraintQueries(row.key).map((text) => ({ text, rows: [row] }))),
    ...project.phrasings.map((phrasing) => ({ text: phrasing, rows: [] as PlanRow[] })),
  ];
}

async function progress(jobId: string | undefined, text: string): Promise<void> {
  if (jobId) {
    await writeProgress(jobId, text);
  }
}

/** One backfill: sweep a year, judge what has no verdict, write the leads. */
export async function runBackfill(projectId: string, jobId?: string): Promise<BackfillOutcome> {
  const project = await loadScanProject(projectId);
  if (!project) {
    throw new Error("This project no longer exists");
  }
  const { limits } = await tierForUser(project.userId);
  const funded = await clientForUser(project.userId);
  const ctx: FetchContext = {
    projectId,
    funded,
    maxAgeMs: scanIntervalHours(limits) * HOUR_MS,
  };

  const queries = queriesOf(project);
  const found = new Map<string, StoredPost>();
  const sourcesByPost = new Map<string, CandidateSource[]>();
  let walks = 0;
  for (const query of queries) {
    for (const sort of SORTS) {
      await progress(jobId, `Searching a year of "${query.text}"`);
      await walk(ctx, query, sort, found, sourcesByPost);
      walks += 1;
    }
  }

  // Retention can delete an unreferenced post while this sweep still holds it,
  // so re-persist everything found before pointing a source or a lead at it.
  await upsertPosts([...found.values()].map(asRawPost));
  await recordSources(
    projectId,
    [...sourcesByPost.entries()].map(([postId, sources]) => ({ postId, sources })),
  );
  const stored = await loadEvaluations(projectId);
  const candidates = await unjudged(project, stored, [...found.values()]);

  await progress(jobId, `Reading ${candidates.length} titles`);
  const triage = await triageTitles(
    projectId,
    project.productText,
    candidates.map((post) => ({
      id: post.id,
      title: post.title,
      subreddit: post.subreddit,
      author: post.author,
      score: post.score,
      ageHours: (Date.now() - post.createdAt.getTime()) / HOUR_MS,
    })),
  );
  const byId = new Map(candidates.map((post) => [post.id, post]));
  const facts = new Map(
    candidates.map((post) => [
      post.id,
      { ageHours: (Date.now() - post.createdAt.getTime()) / HOUR_MS, upvotes: post.score },
    ]),
  );
  const ordered = readOrder(triage, facts)
    .map((id) => byId.get(id))
    .filter((post): post is StoredPost => post !== undefined);

  await progress(jobId, `Scoring ${ordered.length} posts`);
  const judgements = await judgeItems(projectId, project.productText, ordered.map(postItem));
  await writeEvaluations(await evaluationsFor(project, candidates, judgements));
  const leads = routed(judgements.map((judgement) => ({ judgement }))).map((item) =>
    toLead(project, item.judgement, item.judgement.id, null, item.kind),
  );
  await writeLeads(leads);
  await creditSources(
    sourcesByPost,
    ordered.map((post) => post.id),
    leads.map((lead) => lead.postId),
  );
  const at = new Date();
  for (const query of queries) {
    for (const row of query.rows) {
      await markCovered(row, at);
    }
  }

  await progress(jobId, "Finished");
  return { walks, found: found.size, judged: judgements.length, leads: leads.length };
}
