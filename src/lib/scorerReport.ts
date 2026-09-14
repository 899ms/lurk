import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobs, leadEvaluations, leads, llmUsage } from "@/db/schema";

/**
 * What the scorer did, read back from the tables it already writes. One module,
 * because the command line and the settings page must not be able to disagree
 * about a number, and nothing here is computed anywhere else: a page renders
 * these rows and adds nothing to them.
 *
 * Every figure is a count, a sum or a percentile over stored rows. There is no
 * sampling, no estimate, and no rerun of anything.
 */

/** The jobs whose outcome says whether the scorer got to run at all. */
const SCORING_JOBS = ["scan", "backfill", "rescore"];

export type ReportScope = {
  /** The projects to read, or every project when the list is empty. */
  projectIds: string[];
  /** How far back to read, in days. */
  days: number;
};

/** Verdicts and lanes, per version of the scorer that produced them. */
export type ScorerVersionRow = {
  scorerVersion: string;
  qualify: number;
  review: number;
  reject: number;
  buyerLeads: number;
  contextLeads: number;
};

/** What people did with the leads one scorer version put in front of them. */
export type FeedbackRow = {
  scorerVersion: string;
  status: string;
  /** The typed miss reason, on a lead somebody called a miss. */
  notFitReason: string | null;
  leads: number;
  /** This row as a share of the leads of that version somebody acted on. */
  shareOfActed: number;
};

/** One model and provider serving one purpose. */
export type CallHealthRow = {
  purpose: string;
  model: string | null;
  provider: string | null;
  calls: number;
  p50Ms: number | null;
  p95Ms: number | null;
  costUsd: number;
  /** Items asked for that never came back, over the batched calls. */
  itemsDropped: number;
  schemaFailures: number;
  /** Calls that asked again for the ids a first call skipped. */
  retries: number;
  /** This purpose's spend divided by the qualified leads in the window. */
  costPerQualifiedLeadUsd: number | null;
};

export type JobOutcomeRow = {
  kind: string;
  runs: number;
  failures: number;
  meanWallMs: number | null;
};

export type ScorerReport = {
  scope: ReportScope;
  since: Date;
  qualifiedLeads: number;
  versions: ScorerVersionRow[];
  feedback: FeedbackRow[];
  calls: CallHealthRow[];
  jobs: JobOutcomeRow[];
};

function since(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** The project filter, or nothing at all when the report is house-wide. */
function onlyProjects(column: Parameters<typeof inArray>[0], projectIds: string[]) {
  return projectIds.length === 0 ? undefined : inArray(column, projectIds);
}

/**
 * One lead row and the verdict that produced it. A lead is keyed by post or by
 * comment, and a null comment id is not equal to another null, so the join has
 * to say `is not distinct from` rather than `=`.
 */
const SAME_CANDIDATE = and(
  eq(leadEvaluations.projectId, leads.projectId),
  eq(leadEvaluations.postId, leads.postId),
  sql`${leadEvaluations.commentId} is not distinct from ${leads.commentId}`,
);

async function versions(scope: ReportScope, from: Date): Promise<ScorerVersionRow[]> {
  const verdicts = await db()
    .select({
      scorerVersion: leadEvaluations.scorerVersion,
      decision: leadEvaluations.decision,
      total: sql<number>`count(*)::int`,
    })
    .from(leadEvaluations)
    .where(
      and(
        onlyProjects(leadEvaluations.projectId, scope.projectIds),
        gte(leadEvaluations.judgedAt, from),
      ),
    )
    .groupBy(leadEvaluations.scorerVersion, leadEvaluations.decision);
  const lanes = await db()
    .select({
      scorerVersion: leadEvaluations.scorerVersion,
      kind: leads.kind,
      total: sql<number>`count(*)::int`,
    })
    .from(leads)
    .innerJoin(leadEvaluations, SAME_CANDIDATE)
    .where(and(onlyProjects(leads.projectId, scope.projectIds), gte(leads.scoredAt, from)))
    .groupBy(leadEvaluations.scorerVersion, leads.kind);

  const names = [
    ...new Set([...verdicts, ...lanes].map((row) => row.scorerVersion)),
  ].sort();
  const count = <T extends { scorerVersion: string; total: number }>(
    rows: T[],
    version: string,
    match: (row: T) => boolean,
  ) => rows.filter((row) => row.scorerVersion === version && match(row))[0]?.total ?? 0;
  return names.map((version) => ({
    scorerVersion: version,
    qualify: count(verdicts, version, (row) => row.decision === "qualify"),
    review: count(verdicts, version, (row) => row.decision === "review"),
    reject: count(verdicts, version, (row) => row.decision === "reject"),
    buyerLeads: count(lanes, version, (row) => row.kind === "buyer"),
    contextLeads: count(lanes, version, (row) => row.kind === "context"),
  }));
}

async function feedback(scope: ReportScope, from: Date): Promise<FeedbackRow[]> {
  const rows = await db()
    .select({
      scorerVersion: leadEvaluations.scorerVersion,
      status: leads.status,
      notFitReason: leads.notFitReason,
      leads: sql<number>`count(*)::int`,
    })
    .from(leads)
    .innerJoin(leadEvaluations, SAME_CANDIDATE)
    .where(and(onlyProjects(leads.projectId, scope.projectIds), gte(leads.scoredAt, from)))
    .groupBy(leadEvaluations.scorerVersion, leads.status, leads.notFitReason)
    .orderBy(leadEvaluations.scorerVersion, leads.status);
  const acted = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== "new") {
      acted.set(row.scorerVersion, (acted.get(row.scorerVersion) ?? 0) + row.leads);
    }
  }
  return rows.map((row) => {
    const total = acted.get(row.scorerVersion) ?? 0;
    return {
      ...row,
      shareOfActed: row.status === "new" || total === 0 ? 0 : (row.leads / total) * 100,
    };
  });
}

async function callHealth(
  scope: ReportScope,
  from: Date,
  qualifiedLeads: number,
): Promise<CallHealthRow[]> {
  const rows = await db()
    .select({
      purpose: llmUsage.purpose,
      model: llmUsage.model,
      provider: llmUsage.provider,
      calls: sql<number>`count(*)::int`,
      p50Ms: sql<number | null>`percentile_cont(0.5) within group (order by ${llmUsage.latencyMs})::int`,
      p95Ms: sql<number | null>`percentile_cont(0.95) within group (order by ${llmUsage.latencyMs})::int`,
      costUsd: sql<string>`coalesce(sum(${llmUsage.costUsd}), 0)`,
      itemsDropped: sql<number>`coalesce(sum(greatest(coalesce(${llmUsage.itemsAsked}, 0) - coalesce(${llmUsage.itemsAnswered}, 0), 0)), 0)::int`,
      schemaFailures: sql<number>`count(*) filter (where ${llmUsage.schemaFailed})::int`,
      retries: sql<number>`count(*) filter (where ${llmUsage.attempt} > 1)::int`,
    })
    .from(llmUsage)
    .where(and(onlyProjects(llmUsage.projectId, scope.projectIds), gte(llmUsage.at, from)))
    .groupBy(llmUsage.purpose, llmUsage.model, llmUsage.provider)
    .orderBy(llmUsage.purpose);
  return rows.map((row) => ({
    ...row,
    costUsd: Number(row.costUsd),
    costPerQualifiedLeadUsd: qualifiedLeads === 0 ? null : Number(row.costUsd) / qualifiedLeads,
  }));
}

async function jobOutcomes(scope: ReportScope, from: Date): Promise<JobOutcomeRow[]> {
  return db()
    .select({
      kind: jobs.kind,
      runs: sql<number>`count(*)::int`,
      failures: sql<number>`count(*) filter (where ${jobs.error} is not null)::int`,
      meanWallMs: sql<
        number | null
      >`(avg(extract(epoch from (${jobs.finishedAt} - ${jobs.startedAt}))) * 1000)::int`,
    })
    .from(jobs)
    .where(
      and(
        inArray(jobs.kind, SCORING_JOBS),
        onlyProjects(jobs.projectId, scope.projectIds),
        gte(jobs.finishedAt, from),
      ),
    )
    .groupBy(jobs.kind)
    .orderBy(jobs.kind);
}

/** Everything the report says, in one read. */
export async function scorerReport(scope: ReportScope): Promise<ScorerReport> {
  const from = since(scope.days);
  const versionRows = await versions(scope, from);
  const qualifiedLeads = versionRows.reduce((total, row) => total + row.qualify, 0);
  return {
    scope,
    since: from,
    qualifiedLeads,
    versions: versionRows,
    feedback: await feedback(scope, from),
    calls: await callHealth(scope, from, qualifiedLeads),
    jobs: await jobOutcomes(scope, from),
  };
}
