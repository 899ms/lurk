import { HeldCard } from "@/components/leads/HeldCard";
import type { ReviewItem } from "@/lib/feed";

type HeldSectionProps = { items: ReviewItem[] };

/**
 * The candidates the scan would not call either way, under the feed and shut
 * until asked for. They used to share the lead stream, sorted by date, which
 * on 2026-09-10 opened an all-time feed with four held cards above the first
 * real lead. They are worth settling, but never worth reading first.
 */
export function HeldSection({ items }: HeldSectionProps) {
  return (
    <details className="rounded-card border bg-surface">
      <summary className="cursor-pointer list-none p-4">
        <span className="text-small text-fg" style={{ fontWeight: 500 }}>
          Held for review
        </span>
        <span className="text-mono ml-2 text-fg-muted">{items.length}</span>
        <p className="text-small mt-1 text-fg-muted">
          The scan could not settle these either way. They are not leads.
        </p>
      </summary>
      <div className="flex flex-col gap-3 border-t p-4">
        {items.map((item) => (
          <HeldCard key={item.id} item={item} />
        ))}
      </div>
    </details>
  );
}
