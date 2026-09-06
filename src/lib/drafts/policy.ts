/** What a draft is, and when the pitch mode is off the table. */

export const DRAFT_KINDS = ["comment", "dm"] as const;
export const DRAFT_MODES = ["starter", "pitch"] as const;

export type DraftKind = (typeof DRAFT_KINDS)[number];
export type DraftMode = (typeof DRAFT_MODES)[number];

export function isDraftKind(value: string): value is DraftKind {
  return (DRAFT_KINDS as readonly string[]).includes(value);
}

export function isDraftMode(value: string): value is DraftMode {
  return (DRAFT_MODES as readonly string[]).includes(value);
}

/**
 * Phrases a summarised subreddit rule uses when it forbids self-promotion.
 * Matched against the one-sentence policy the scan already stored.
 */
const BANNED_PHRASES = [
  "banned",
  "not allowed",
  "no self-promotion",
  "no self promotion",
  "no promotion",
  "no advertising",
  "prohibited",
  "forbidden",
];

/** True when this subreddit's rule leaves room to mention a product at all. */
export function pitchAllowed(promoPolicy: string | null | undefined): boolean {
  if (!promoPolicy) {
    return true;
  }
  const policy = promoPolicy.toLowerCase();
  return !BANNED_PHRASES.some((phrase) => policy.includes(phrase));
}

/** The one sentence the screen shows instead of a pitch draft. */
export function pitchRefusal(subreddit: string, promoPolicy: string | null | undefined): string {
  const rule = promoPolicy?.trim();
  return `r/${subreddit} does not allow self-promotion${rule ? ` (${rule})` : ""}, so this one only gets a conversation starter.`;
}
