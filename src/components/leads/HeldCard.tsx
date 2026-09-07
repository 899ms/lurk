import { ArrowUp, ExternalLink, MessageCircle } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { SubredditChip } from "@/components/SubredditChip";
import { verdictFor } from "@/components/leads/verdict";
import { relativeAge } from "@/lib/format";
import type { ReviewItem } from "@/lib/feed";

type HeldCardProps = { item: ReviewItem };

/**
 * A thread the scan would not call either way, in the same stream as the
 * leads but shorter and quieter: who asked, what they asked, why the scan
 * hesitated, and one plain verdict at the right. A warm edge marks a possible
 * buyer; a muted one marks a probable miss.
 */
export function HeldCard({ item }: HeldCardProps) {
  const verdict = verdictFor(item);
  const warm = verdict.tone === "warm";
  return (
    <div
      className={`flex gap-4 rounded-card border border-l-2 bg-surface p-4 ${
        warm ? "border-l-score-warm" : "border-l-border"
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <AuthorAvatar name={item.author} src={item.avatarUrl} size={24} />
          <span className="text-small text-fg-muted">u/{item.author ?? "unknown"}</span>
          <SubredditChip name={item.subreddit} iconUrl={item.subredditIconUrl} />
          <span className="text-mono text-fg-muted">{relativeAge(item.createdAt)}</span>
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-small text-fg underline-offset-2 hover:underline"
          style={{ fontWeight: 500 }}
        >
          {item.title}
        </a>
        <p className="text-small text-fg-muted">{item.reason}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-mono tabular-nums text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <ArrowUp className="size-3.5" aria-hidden="true" />
            {item.points ?? 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" aria-hidden="true" />
            {item.numComments ?? 0}
          </span>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-small text-fg-muted hover:text-fg"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Open on Reddit
          </a>
        </div>
      </div>
      <div className="flex w-44 shrink-0 flex-col items-end gap-1 text-right">
        <span
          className={`rounded-control px-2 py-0.5 text-small ${
            warm ? "bg-score-warm/15 text-score-warm" : "bg-surface-2 text-fg-muted"
          }`}
          style={{ fontWeight: 500 }}
        >
          {verdict.label}
        </span>
        {verdict.codes.map((code) => (
          <span key={code} className="text-mono text-fg-muted">
            {code}
          </span>
        ))}
      </div>
    </div>
  );
}
