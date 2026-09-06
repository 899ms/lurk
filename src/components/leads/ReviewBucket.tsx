import { relativeAge } from "@/lib/format";
import type { ReviewItem } from "@/lib/feed";

type ReviewBucketProps = { items: ReviewItem[] };

/** The gate that held an item, in the words the scan actually recorded. */
function codes(item: ReviewItem): string {
  return item.reasonCodes.map((code) => code.replace(/_/g, " ")).join(", ");
}

/**
 * The candidates the scan would not call either way. They are not leads, so
 * they stay out of the feed and out of its counts, but the evidence that held
 * them is on screen instead of only in the database.
 */
export function ReviewBucket({ items }: ReviewBucketProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-h3 text-fg" style={{ fontWeight: 500 }}>
          Needs a look
        </h3>
        <span className="text-mono text-fg-muted">
          {items.length} held, not scored as leads
        </span>
      </div>
      <div className="flex flex-col divide-y rounded-card border bg-surface">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-1 p-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-small text-fg underline-offset-2 hover:underline"
                style={{ fontWeight: 500 }}
              >
                {item.title}
              </a>
              <span className="text-mono text-fg-muted">
                r/{item.subreddit} - u/{item.author ?? "unknown"}
                {item.isComment ? " - comment" : ""}
              </span>
              <span className="text-mono text-fg-muted">{relativeAge(item.createdAt)}</span>
            </div>
            <p className="text-small text-fg-muted">{item.reason}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-mono tabular-nums text-fg-muted">
              <span>{codes(item)}</span>
              <span>fit {item.fit ?? "-"} / 4</span>
              <span>intent {item.intent ?? "-"} / 4</span>
              <span>need {item.needState.replace(/_/g, " ")}</span>
              <span>judged {relativeAge(item.judgedAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
