import type { CardLead } from "@/components/leads/LeadCard";

/** One thing in the feed: a lead the gates qualified. Nothing else. */
export type StreamEntry = { id: string; at: Date; lead: CardLead };

/** A run of entries that were posted on the same calendar day. */
export type StreamDay = { day: number; label: string; entries: StreamEntry[] };

/**
 * The leads this project holds, best first, in the order the feed query gave
 * them: score, then how recently the need was posted. Freshness is already
 * half of that score, so sorting the stream by date on top of it threw fit and
 * intent away and opened the feed with whatever was newest. On 2026-09-10 that
 * was two crossposts of one person recruiting festival companions.
 *
 * Held candidates are deliberately not here either: they are the pile the scan
 * would not call either way, and four of them, warm-badged, sat above the first
 * real lead. They have their own section under the feed instead.
 */
export function buildStream(cards: CardLead[]): StreamEntry[] {
  return cards.map((lead): StreamEntry => ({ id: `lead-${lead.id}`, at: lead.createdAt, lead }));
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * The same entries bucketed into days, newest day first, for the people strip.
 * The strip is a calendar, so it sorts by date whatever order the feed is in.
 */
export function groupByDay(entries: StreamEntry[]): StreamDay[] {
  const days: StreamDay[] = [];
  const byDate = [...entries].sort((a, b) => b.at.getTime() - a.at.getTime());
  for (const entry of byDate) {
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
