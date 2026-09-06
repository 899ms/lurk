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

function describe(item: ScorableItem, body: string, parentBody: string | null): string {
  return [
    `id: ${item.id}`,
    `subreddit: r/${item.subreddit}`,
    `target author: ${item.author ?? "unknown"}`,
    `age: ${Math.round(item.ageHours)}h`,
    `upvotes: ${item.upvotes ?? 0}`,
    `comments on the thread: ${item.numComments ?? 0}`,
    `title: ${item.title}`,
    parentBody === null ? null : `parent post the target is replying to: ${parentBody}`,
    `target text: ${body}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

/** Everything the judgement prompt says it receives, for one candidate. */
export function describeItem(item: ScorableItem): string {
  return describe(
    item,
    truncateBody(item.body),
    item.parentBody === null ? null : truncateBody(item.parentBody, PARENT_CHAR_BUDGET),
  );
}

/**
 * The same fields with nothing cut. A quote the model took from either side of
 * an elision is still the person's own words, so the validator checks this text
 * as well as the excerpt the model was shown.
 */
export function describeItemUncut(item: ScorableItem): string {
  return describe(item, item.body, item.parentBody);
}

/** Reddit's own markers for a body or an author it has taken away. */
const SENTINEL_BODIES = ["[deleted]", "[removed]"];
const SENTINEL_AUTHOR = "[deleted]";

/**
 * True when Reddit has taken the content away. There is nothing here for a
 * model to read and nothing for a person to answer, so such an item is never
 * triaged, never judged, and never stored as a verdict about anybody.
 */
export function isSentinel(item: { body: string | null; author: string | null }): boolean {
  const body = (item.body ?? "").trim().toLowerCase();
  const author = (item.author ?? "").trim().toLowerCase();
  return SENTINEL_BODIES.includes(body) || author === SENTINEL_AUTHOR;
}
