import { z } from "zod";
import { generateStructured } from "@/lib/llm";

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;

export type Sentiment = (typeof SENTIMENTS)[number];

export const CLASSIFY_SYSTEM = `You are reading Reddit posts that name a product. For each post say how the writer talks about that product and what they said, in one line. sentiment is positive when they recommend it or say it worked, negative when they complain, are leaving, or warn others off, and neutral when they only mention it, ask about it, or compare it without a verdict. Judge the named product only, not the rest of the post. Copy each id exactly and answer for every post you are given.`;

const verdictSchema = z.object({
  mentions: z.array(
    z.object({
      id: z.string(),
      sentiment: z.enum(SENTIMENTS),
      summary: z.string(),
    }),
  ),
});

export type MentionCandidate = {
  id: string;
  title: string;
  subreddit: string;
  body: string;
};

export type Verdict = { sentiment: Sentiment; summary: string };

function describe(item: MentionCandidate): string {
  return [
    `id: ${item.id}`,
    `subreddit: r/${item.subreddit}`,
    `title: ${item.title}`,
    `text: ${item.body.slice(0, 3000)}`,
  ].join("\n");
}

/**
 * One call for one competitor's posts. An answer about a post we did not send,
 * or a second answer about the same post, is dropped rather than stored.
 */
export async function classifyMentions(
  projectId: string,
  competitor: string,
  items: MentionCandidate[],
): Promise<Map<string, Verdict>> {
  const out = new Map<string, Verdict>();
  if (items.length === 0) {
    return out;
  }
  const result = await generateStructured({
    purpose: "competitors",
    projectId,
    schema: verdictSchema,
    system: CLASSIFY_SYSTEM,
    prompt: [
      `Product being talked about: ${competitor}`,
      "",
      "Posts:",
      items.map(describe).join("\n---\n"),
    ].join("\n"),
  });
  const known = new Set(items.map((item) => item.id));
  for (const mention of result.mentions) {
    if (known.has(mention.id) && !out.has(mention.id)) {
      out.set(mention.id, { sentiment: mention.sentiment, summary: mention.summary.trim() });
    }
  }
  return out;
}
