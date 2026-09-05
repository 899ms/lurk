import { SubredditChip } from "@/components/SubredditChip";
import { MockButton } from "./MockButton";
import { MockFrame } from "./MockFrame";
import { MOCK_SEO_ROWS } from "./mockContent";

/** Reddit SEO: the threads that already rank for what you sell. */
export function AppMockSeo() {
  return (
    <MockFrame
      active="Reddit SEO"
      title="Reddit SEO"
      actions={
        <>
          <MockButton label="Last refreshed today" />
          <MockButton label="Refresh" tone="solid" />
        </>
      }
    >
      <div className="p-4">
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,5fr)_auto_auto_auto] items-center gap-x-4 border-b pb-2 text-mono text-fg-muted">
          <span>Keyword</span>
          <span>Reddit thread on page one</span>
          <span className="text-right">Rank</span>
          <span className="text-right">Comments</span>
          <span className="text-right">Rival named</span>
        </div>
        {MOCK_SEO_ROWS.map((row) => (
          <div
            key={row.keyword}
            className="grid grid-cols-[minmax(0,3fr)_minmax(0,5fr)_auto_auto_auto] items-center gap-x-4 border-b py-2.5"
          >
            <span className="truncate text-small text-fg">{row.keyword}</span>
            <span className="min-w-0">
              <span className="block truncate text-small text-fg-muted">{row.thread}</span>
              <SubredditChip name={row.subreddit} />
            </span>
            <span className="text-right text-small tabular-nums text-fg">{row.position}</span>
            <span className="text-right text-small tabular-nums text-fg-muted">{row.comments}</span>
            <span className="text-right text-mono text-fg-muted">{row.rival ? "yes" : "no"}</span>
          </div>
        ))}
        <p className="pt-3 text-mono text-fg-muted">
          Monthly search volume is on when you connect an AnyAPI wallet. It bills at the catalog
          price for that call.
        </p>
      </div>
    </MockFrame>
  );
}
