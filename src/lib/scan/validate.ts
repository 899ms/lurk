import { downgradeToReview } from "./gates";
import type { Judgement } from "./judgement";

/**
 * Structured output proves the shape of an answer, never its truth. These
 * checks prove the two things the shape cannot: that every judgement belongs to
 * an item we actually sent, and that every quote is really in the text we sent.
 */

export type Reconciled<T> = { items: T[]; missing: string[] };

/**
 * Drops ids that were never in the batch and duplicate answers, and reports the
 * ids the model left out. A missing id is unevaluated, never a rejection.
 */
export function reconcileIds<T extends { id: string }>(
  returned: T[],
  expected: string[],
): Reconciled<T> {
  const wanted = new Set(expected);
  const seen = new Set<string>();
  const items: T[] = [];
  for (const item of returned) {
    if (wanted.has(item.id) && !seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }
  return { items, missing: expected.filter((id) => !seen.has(id)) };
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Strips what a model adds around a quote without meaning to change it. */
function bare(quote: string): string {
  return normalize(quote)
    .replace(/^["'“‘]+/, "")
    .replace(/["'”’]+$/, "")
    .replace(/(\.\.\.|…)$/, "")
    .trim();
}

/** True when the quote really is in the supplied text, whitespace aside. */
export function isVerbatim(quote: string, supplied: string): boolean {
  const needle = bare(quote);
  return needle.length > 0 && normalize(supplied).includes(needle);
}

function quotesOf(item: Judgement): string[] {
  return [
    ...(item.needEvidence ? [item.needEvidence.quote] : []),
    ...item.requirements.map((need) => need.targetEvidence.quote),
  ];
}

/**
 * A judgement whose evidence is not in the text goes to review, not to the
 * feed. So does a qualified lead with no quote of the person's own words at
 * all: the feed card is built out of that quote.
 */
export function withCheckedEvidence(item: Judgement, supplied: string): Judgement {
  const quotes = quotesOf(item);
  const unquoted = item.decision === "qualify" && !item.needEvidence;
  if (unquoted || quotes.some((quote) => !isVerbatim(quote, supplied))) {
    return downgradeToReview(item, "insufficient_evidence");
  }
  return item;
}
