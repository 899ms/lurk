import { CompetitorChip } from "@/components/competitors/CompetitorChip";
import type { MentionSeries } from "@/lib/competitors/read";

type MentionsBarProps = { series: MentionSeries[] };

const MIN_BAR_PERCENT = 6;

/** One row of daily bars per competitor, all rows sharing one scale. */
export function MentionsBar({ series }: MentionsBarProps) {
  const peak = Math.max(1, ...series.flatMap((row) => row.days));
  return (
    <div className="flex flex-col gap-4 rounded-card border bg-surface p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3" style={{ fontWeight: 500 }}>
          Mentions over the last 30 days
        </h2>
        <p className="text-small text-fg-muted">One bar per day, oldest on the left.</p>
      </div>
      {series.map((row) => (
        <div key={row.competitor} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <CompetitorChip name={row.competitor} />
            <span className="text-small tabular-nums text-fg-muted">
              {row.total} {row.total === 1 ? "mention" : "mentions"}
            </span>
          </div>
          <div className="flex h-14 items-end gap-1">
            {row.days.map((value, index) => (
              <span
                key={index}
                title={`${value} on day ${index + 1}`}
                className="flex-1 rounded-t-sm bg-surface-2"
                style={{
                  height: `${value === 0 ? MIN_BAR_PERCENT : Math.max(MIN_BAR_PERCENT, (value / peak) * 100)}%`,
                  backgroundColor: value === 0 ? undefined : "var(--fg)",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
