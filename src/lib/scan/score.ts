import { z } from "zod";
import { generateStructured } from "@/lib/llm";
import { PREFILTER_SYSTEM, SCORER_SYSTEM } from "@/lib/prompts";
import { foldScore, SCORE_BATCH_SIZE } from "./constants";

export type ProfileText = string;

const prefilterSchema = z.object({
  posts: z.array(z.object({ id: z.string(), keep: z.boolean(), why: z.string() })),
});

const judgementSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      fit: z.number().int().min(1).max(10),
      intent: z.number().int().min(1).max(10),
      engagement: z.number().int().min(1).max(10),
      stage: z.enum(["problem_aware", "solution_seeking", "comparing", "purchase_ready"]),
      reason: z.string(),
      matchedPhrase: z.string(),
      sellerSide: z.boolean(),
    }),
  ),
});

export type Judgement = z.infer<typeof judgementSchema>["items"][number] & { score: number };

export type PrefilterCandidate = {
  id: string;
  title: string;
  subreddit: string;
  author: string | null;
  score: number | null;
  ageHours: number;
};

export type ScorableItem = { id: string; title: string; subreddit: string; body: string };

function describeCandidate(candidate: PrefilterCandidate): string {
  return [
    `id: ${candidate.id}`,
    `title: ${candidate.title}`,
    `subreddit: r/${candidate.subreddit}`,
    `author: ${candidate.author ?? "unknown"}`,
    `upvotes: ${candidate.score ?? 0}`,
    `age: ${Math.round(candidate.ageHours)}h`,
  ].join(" | ");
}

/**
 * One call over every new title. Costs no Reddit data, and decides which posts
 * are worth buying in full.
 */
export async function prefilterTitles(
  projectId: string,
  product: ProfileText,
  candidates: PrefilterCandidate[],
): Promise<Map<string, string>> {
  if (candidates.length === 0) {
    return new Map();
  }
  const result = await generateStructured({
    purpose: "prefilter",
    projectId,
    schema: prefilterSchema,
    system: `${PREFILTER_SYSTEM} Return the posts you keep first, best candidate first.`,
    prompt: [
      "Product:",
      product,
      "",
      "Posts:",
      ...candidates.map(describeCandidate),
    ].join("\n"),
  });
  const kept = new Map<string, string>();
  for (const post of result.posts) {
    if (post.keep && !kept.has(post.id)) {
      kept.set(post.id, post.why);
    }
  }
  return kept;
}

function describeItem(item: ScorableItem): string {
  return [`id: ${item.id}`, `subreddit: r/${item.subreddit}`, `title: ${item.title}`, `text: ${item.body.slice(0, 3000)}`].join(
    "\n",
  );
}

/** Scores items in batches, folding the three dimensions into one 0-100 sort order. */
export async function scoreItems(
  projectId: string,
  product: ProfileText,
  items: ScorableItem[],
): Promise<Judgement[]> {
  const out: Judgement[] = [];
  for (let start = 0; start < items.length; start += SCORE_BATCH_SIZE) {
    const batch = items.slice(start, start + SCORE_BATCH_SIZE);
    const result = await generateStructured({
      purpose: "score",
      projectId,
      schema: judgementSchema,
      system: SCORER_SYSTEM,
      prompt: ["Product:", product, "", "Items:", batch.map(describeItem).join("\n---\n")].join("\n"),
    });
    for (const item of result.items) {
      out.push({ ...item, score: foldScore(item.fit, item.intent, item.engagement) });
    }
  }
  return out;
}
