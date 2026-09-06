import { describeItem, describeItemUncut } from "./evidence";
import { downgradeToReview } from "./gates";
import type { Judgement, ScorableItem } from "./judgement";

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

/**
 * One text as a quote can be compared against it. Reddit and the model disagree
 * about typography, never about words: the body carries smart quotes, dashes
 * and the backslashes Reddit escapes markdown with, and the model returns the
 * plain characters. Whitespace runs collapse for the same reason.
 */
function normalize(text: string): string {
  return text
    .replace(/\\([^\p{L}\p{N}\s])/gu, "$1")
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strips what a model adds around a quote without meaning to change it. */
function bare(quote: string): string {
  return normalize(quote)
    .replace(/^["']+/, "")
    .replace(/["']+$/, "")
    .replace(/(\.\.\.|\u2026)$/, "")
    .trim();
}

/** True when the quote really is in one of the supplied texts, typography aside. */
export function isVerbatim(quote: string, supplied: string[]): boolean {
  const needle = bare(quote);
  return needle.length > 0 && supplied.some((text) => normalize(text).includes(needle));
}

function quotesOf(item: Judgement): string[] {
  return [
    ...(item.needEvidence ? [item.needEvidence.quote] : []),
    ...item.requirements.map((need) => need.targetEvidence.quote),
  ];
}

/**
 * A judgement whose evidence is in neither the excerpt the model was shown nor
 * the item's own untruncated text goes to review, not to the feed. So does a
 * qualified lead with no quote of the person's own words at all: the feed card
 * is built out of that quote.
 */
export function withCheckedEvidence(item: Judgement, source: ScorableItem): Judgement {
  const supplied = [describeItem(source), describeItemUncut(source)];
  const unquoted = item.decision === "qualify" && !item.needEvidence;
  if (unquoted || quotesOf(item).some((quote) => !isVerbatim(quote, supplied))) {
    return downgradeToReview(item, "insufficient_evidence");
  }
  return item;
}
