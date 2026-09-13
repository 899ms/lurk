import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { projectSubreddits, projects, subreddits } from "@/db/schema";
import { enqueueJob } from "@/jobs/enqueue";
import { clientForUser } from "./anyapi";
import { discoveryBudget, runDiscovery } from "./discovery/run";
import { generateStructured } from "./llm";
import { PROFILE_SYSTEM, PROMO_POLICY_SYSTEM } from "./prompts";
import { normalizeQuery, recordUsage } from "./reddit/fetch";
import { fetchSubredditDetails } from "./reddit/skus";
import { tierForUser } from "./tier";
import { assertHouseDataUnderCap } from "./usage";

/** How long a subreddit sidebar is reused before we buy it again. */
const SUBREDDIT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * What one product page can tell us. Communities, searches and competitors are
 * absent on purpose: those are discovered from Google evidence, so a model
 * that has heard of this company cannot hand the scan a community nobody has
 * ever seen a relevant thread in.
 */
const profileSchema = z.object({
  name: z.string(),
  pain: z.string(),
  solution: z.string(),
  targetUsers: z.string(),
  capabilities: z.array(z.string()),
  exclusions: z.array(z.string()),
  notBuyers: z.array(z.string()),
  serviceGeography: z.string(),
  destinations: z.array(z.object({ name: z.string(), sourceText: z.string() })),
  problemPhrasings: z.array(z.string()),
  budgetFit: z.string(),
});

export type ProductProfile = z.infer<typeof profileSchema>;

export type ProfileStep = "scrape" | "profile" | "discovery" | "subreddits" | "done";

/**
 * Reads the product page. It buys no shared run, so it counts against the house
 * cap through the same seam every Reddit fetch uses, and is refused by it.
 */
async function scrapeProduct(projectId: string, userId: string, url: string) {
  const funded = await clientForUser(userId);
  if (funded.funding === "house") {
    await assertHouseDataUnderCap();
  }
  const { result: res, requestId } = await funded.call(() => funded.client.web.scrape({ url }));
  await recordUsage({
    projectId,
    sku: "web.scrape",
    costUsd: res.costUsd,
    requestId,
    searchRunId: null,
    fundedBy: funded.funding,
    reused: false,
  });
  if (!res.output.found) {
    throw new Error(`AnyAPI could not read ${url}`);
  }
  return res.output.data;
}

/** Fills the shared subreddit row and its one-sentence self-promotion rule. */
async function resolveSubreddit(
  projectId: string,
  userId: string,
  name: string,
): Promise<string | null> {
  const funded = await clientForUser(userId);
  const result = await fetchSubredditDetails(
    { projectId, funded, maxAgeMs: SUBREDDIT_MAX_AGE_MS },
    name,
    SUBREDDIT_MAX_AGE_MS,
  );
  if (!result.value) {
    return null;
  }
  const key = normalizeQuery(name);
  const existing = await db().select().from(subreddits).where(eq(subreddits.name, key));
  if (!existing[0]?.promoPolicy) {
    const summary = await generateStructured({
      purpose: "promo_policy",
      projectId,
      schema: z.object({ policy: z.string() }),
      system: PROMO_POLICY_SYSTEM,
      prompt: `Subreddit r/${name} sidebar:\n\n${result.value.description}`,
    });
    await db()
      .update(subreddits)
      .set({ promoPolicy: summary.policy })
      .where(eq(subreddits.name, key));
  }
  return key;
}

/**
 * Buys the sidebar and the self-promotion rule for every community the plan
 * will actually read. Discovery has already proved each one carries relevant
 * threads, so this spends only on communities that earned a slot.
 */
async function resolveActiveSubreddits(projectId: string, userId: string): Promise<string[]> {
  const rows = await db()
    .select()
    .from(projectSubreddits)
    .where(
      and(
        eq(projectSubreddits.projectId, projectId),
        inArray(projectSubreddits.state, ["active", "pinned"]),
      ),
    );
  const resolved: string[] = [];
  for (const row of rows) {
    const key = await resolveSubreddit(projectId, userId, row.name);
    if (key) {
      resolved.push(key);
    }
  }
  return resolved;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export type BuiltProfile = ProductProfile & { subreddits: string[] };

/**
 * Reads the product's own page for what the product is, then learns from
 * Google where and how its buyers ask, and publishes the plan the scan spends
 * on. The page decides the facts; the evidence decides the plan; the first
 * weekly delta is booked before this returns.
 */
export async function buildProfile(
  projectId: string,
  userId: string,
  url: string,
  onStep?: (step: ProfileStep) => Promise<void> | void,
): Promise<BuiltProfile> {
  const { limits } = await tierForUser(userId);
  await onStep?.("scrape");
  const page = await scrapeProduct(projectId, userId, url);

  await onStep?.("profile");
  const profile = await generateStructured({
    purpose: "profile",
    projectId,
    schema: profileSchema,
    system: PROFILE_SYSTEM,
    prompt: [
      `Website: ${page.url}`,
      `Title: ${page.title}`,
      `Description: ${page.description}`,
      "",
      (page.markdown ?? "").slice(0, 12000),
    ].join("\n"),
  });

  await db()
    .update(projects)
    .set({
      name: profile.name || undefined,
      pain: profile.pain,
      solution: profile.solution,
      targetUsers: profile.targetUsers,
      geography: profile.serviceGeography || null,
      budgetFit: profile.budgetFit,
      capabilities: profile.capabilities,
      exclusions: profile.exclusions,
      notBuyers: profile.notBuyers,
      destinations: profile.destinations,
      problemPhrasings: profile.problemPhrasings,
    })
    .where(eq(projects.id, projectId));

  await onStep?.("discovery");
  await runDiscovery({
    projectId,
    userId,
    facts: {
      name: profile.name,
      pain: profile.pain,
      solution: profile.solution,
      targetUsers: profile.targetUsers,
      serviceGeography: profile.serviceGeography,
      budgetFit: profile.budgetFit,
      capabilities: profile.capabilities,
      exclusions: profile.exclusions,
    },
    destinations: profile.destinations,
    problemPhrasings: profile.problemPhrasings,
    limits,
  });

  await onStep?.("subreddits");
  const resolved = await resolveActiveSubreddits(projectId, userId);

  await enqueueJob(
    "discovery_refresh",
    projectId,
    new Date(Date.now() + discoveryBudget(limits).refreshDays * DAY_MS),
  );
  /**
   * The three jobs that fill the project's first screens: a one-time sweep of a
   * year of Reddit's own search, the Google pass that fills the Reddit SEO tab,
   * then the scan that fills the competitors tab. All are queued now, in that
   * order, so none of them waits for a person. Project creation is the one
   * place these belong: the scheduler seeds projects that already exist.
   */
  await enqueueJob("backfill", projectId);
  await enqueueJob("seo_refresh", projectId);
  await enqueueJob("competitor_scan", projectId);
  await onStep?.("done");
  return { ...profile, subreddits: resolved };
}
