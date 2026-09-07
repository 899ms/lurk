import type { CardLead } from "@/components/leads/LeadCard";
import type { ReviewItem } from "@/lib/feed";

/** One thing in the single stream: a scored lead, or an item the scan held. */
export type StreamEntry =
  | { kind: "lead"; id: string; at: Date; lead: CardLead }
  | { kind: "held"; id: string; at: Date; item: ReviewItem };

/** A run of entries that were posted on the same calendar day. */
export type StreamDay = { day: number; label: string; entries: StreamEntry[] };

/**
 * Everything the scan surfaced, newest first. A lead and a held item posted at
 * the same moment put the lead first, so a new lead still opens the stream.
 */
export function buildStream(cards: CardLead[], review: ReviewItem[]): StreamEntry[] {
  const entries: StreamEntry[] = [
    ...cards.map(
      (lead): StreamEntry => ({ kind: "lead", id: `lead-${lead.id}`, at: lead.createdAt, lead }),
    ),
    ...review.map(
      (item): StreamEntry => ({ kind: "held", id: `held-${item.id}`, at: item.createdAt, item }),
    ),
  ];
  return entries.sort((a, b) => {
    const byTime = b.at.getTime() - a.at.getTime();
    if (byTime !== 0) {
      return byTime;
    }
    return (a.kind === "lead" ? 0 : 1) - (b.kind === "lead" ? 0 : 1);
  });
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** The same entries bucketed into days, newest day first, for the people strip. */
export function groupByDay(entries: StreamEntry[]): StreamDay[] {
  const days: StreamDay[] = [];
  for (const entry of entries) {
    const day = startOfDay(entry.at);
    const last = days.at(-1);
    if (last && last.day === day) {
      last.entries.push(entry);
    } else {
      days.push({
        day,
        label: entry.at.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        entries: [entry],
      });
    }
  }
  return days;
}

/** The ring tone a lead's face wears in the strip, by its score band. */
export function scoreRing(score: number): string {
  return score >= 80 ? "ring-score-hot" : "ring-score-warm";
}
