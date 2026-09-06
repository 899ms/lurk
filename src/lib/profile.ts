import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  projectCompetitors,
  projectKeywords,
  projectSubreddits,
  projects,
  subreddits,
} from "@/db/schema";
import { clientForUser } from "./anyapi";
import { generateStructured } from "./llm";
import { PROFILE_SYSTEM, PROMO_POLICY_SYSTEM } from "./prompts";
import { normalizeQuery, recordUsage } from "./reddit/fetch";
import { fetchSubredditDetails } from "./reddit/skus";
import { capped, tierForUser } from "./tier";
import { assertHouseDataUnderCap } from "./usage";

/** How long a subreddit sidebar is reused before we buy it again. */
const SUBREDDIT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const profileSchema = z.object({
  name: z.string(),
  pain: z.string(),
  solution: z.string(),
  targetUsers: z.string(),
  geography: z.string(),
  budgetFit: z.string(),
  competitors: z.array(z.string()),
  subreddits: z.array(z.string()),
  keywords: z.array(z.string()),
});

export type ProductProfile = z.infer<typeof profileSchema>;

export type ProfileStep = "scrape" | "profile" | "subreddits" | "done";

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

async function replaceChildren(projectId: string, profile: ProductProfile, limits: {
  keywords: number | null | undefined;
  subredditNames: string[];
  competitors: number | null | undefined;
}) {
  await db().delete(projectKeywords).where(eq(projectKeywords.projectId, projectId));
  await db().delete(projectSubreddits).where(eq(projectSubreddits.projectId, projectId));
  await db().delete(projectCompetitors).where(eq(projectCompetitors.projectId, projectId));
  const keywords = capped(profile.keywords, limits.keywords);
  const competitors = capped(profile.competitors, limits.competitors);
  if (keywords.length > 0) {
    await db()
      .insert(projectKeywords)
      .values(keywords.map((keyword) => ({ projectId, keyword })))
      .onConflictDoNothing();
  }
  if (limits.subredditNames.length > 0) {
    await db()
      .insert(projectSubreddits)
      .values(limits.subredditNames.map((name) => ({ projectId, name })))
      .onConflictDoNothing();
  }
  if (competitors.length > 0) {
    await db()
      .insert(projectCompetitors)
      .values(competitors.map((name) => ({ projectId, name })))
      .onConflictDoNothing();
  }
}

/**
 * Reads the product's own page, asks the model who buys it and where they post,
 * then resolves every named subreddit once. Replaces whatever the project held.
 */
export async function buildProfile(
  projectId: string,
  userId: string,
  url: string,
  onStep?: (step: ProfileStep) => Promise<void> | void,
): Promise<ProductProfile> {
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
      geography: profile.geography || null,
      budgetFit: profile.budgetFit,
    })
    .where(eq(projects.id, projectId));

  await onStep?.("subreddits");
  const wanted = capped(profile.subreddits, limits?.subredditsPerProject);
  const resolved: string[] = [];
  for (const name of wanted) {
    const key = await resolveSubreddit(projectId, userId, name);
    if (key) {
      resolved.push(key);
    }
  }

  await replaceChildren(projectId, profile, {
    keywords: limits?.keywordsPerProject,
    competitors: limits?.competitors,
    subredditNames: resolved,
  });
  await onStep?.("done");
  return { ...profile, subreddits: resolved };
}
