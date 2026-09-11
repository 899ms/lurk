import { CompetitorChip } from "@/components/competitors/CompetitorChip";
import { SENTIMENT_DOT, SENTIMENT_WORD } from "@/components/competitors/sentiment";
import { SENTIMENTS } from "@/lib/competitors/classify";
import type { CompetitorCount } from "@/lib/competitors/read";
import { cn } from "@/lib/utils";

type TopCompetitorsProps = { rows: CompetitorCount[] };

/** Who Reddit named most in the window, and how the people naming them talked. */
export function TopCompetitors({ rows }: TopCompetitorsProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-small text-fg-muted">Top competitors</h2>
      <ul className="flex flex-col divide-y rounded-card border bg-surface">
        {rows.map((row) => (
          <li
            key={row.competitor}
            className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
          >
            <CompetitorChip name={row.competitor} count={row.total} />
            <span className="flex items-center gap-3">
              {SENTIMENTS.map((sentiment) => (
                <span
                  key={sentiment}
                  className="inline-flex items-center gap-1.5 text-small tabular-nums text-fg-muted"
                  title={SENTIMENT_WORD[sentiment]}
                >
                  <span
                    className={cn("size-2 rounded-full", SENTIMENT_DOT[sentiment])}
                    aria-hidden="true"
                  />
                  {row.sentiments[sentiment]}
                  <span className="sr-only">{SENTIMENT_WORD[sentiment]}</span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
