import type { ScorableItem, TriageCandidate } from "./judgement";

/**
 * The text each model call sees, and nothing else. The quote validator checks
 * the model's evidence against exactly the string built here, so what the model
 * was allowed to read and what it is allowed to quote cannot drift apart.
 */

/** The most characters of one body the scorer is given. */
export const BODY_CHAR_BUDGET = 3000;

/** The most characters of a comment's parent post the scorer is given. */
export const PARENT_CHAR_BUDGET = 1200;

const ELISION = "\n[...]\n";

/**
 * Keeps the head and the tail of a long body. Reddit puts the edit, the update
 * and the "solved, thanks" at the end, so a head-only cut removes exactly the
 * evidence that would reject the lead.
 */
export function truncateBody(body: string, budget = BODY_CHAR_BUDGET): string {
  if (body.length <= budget) {
    return body;
  }
  const head = Math.ceil(budget / 2);
  const tail = budget - head;
  return `${body.slice(0, head)}${ELISION}${body.slice(body.length - tail)}`;
}

export function describeCandidate(candidate: TriageCandidate): string {
  return [
    `id: ${candidate.id}`,
    `title: ${candidate.title}`,
    `subreddit: r/${candidate.subreddit}`,
    `author: ${candidate.author ?? "unknown"}`,
    `upvotes: ${candidate.score ?? 0}`,
    `age: ${Math.round(candidate.ageHours)}h`,
  ].join(" | ");
}

/** Everything the judgement prompt says it receives, for one candidate. */
export function describeItem(item: ScorableItem): string {
  return [
    `id: ${item.id}`,
    `subreddit: r/${item.subreddit}`,
    `target author: ${item.author ?? "unknown"}`,
    `age: ${Math.round(item.ageHours)}h`,
    `upvotes: ${item.upvotes ?? 0}`,
    `comments on the thread: ${item.numComments ?? 0}`,
    `title: ${item.title}`,
    item.parentBody === null
      ? null
      : `parent post the target is replying to: ${truncateBody(item.parentBody, PARENT_CHAR_BUDGET)}`,
    `target text: ${truncateBody(item.body)}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
