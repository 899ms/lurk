import type { Sentiment } from "@/lib/competitors/classify";

/** The dot colour a sentiment wears, on a card and in the ranked list alike. */
export const SENTIMENT_DOT: Record<Sentiment, string> = {
  positive: "bg-score-hot",
  neutral: "bg-fg-muted",
  negative: "bg-score-warm",
};

/** What a sentiment means, in the words the product says it in. */
export const SENTIMENT_WORD: Record<Sentiment, string> = {
  positive: "Speaks well of it",
  neutral: "Mentions it",
  negative: "Complains about it",
};
