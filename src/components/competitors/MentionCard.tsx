import { AuthorAvatar } from "@/components/AuthorAvatar";
import { CostLine } from "@/components/CostLine";
import { SubredditChip } from "@/components/SubredditChip";
import { relativeAge } from "@/lib/format";
import type { Sentiment } from "@/lib/competitors/classify";
import type { MentionView } from "@/lib/competitors/read";
import type { LeadCost } from "@/lib/feed";
import { cn } from "@/lib/utils";

type MentionCardProps = { mention: MentionView; cost: LeadCost | null };

const DOT: Record<Sentiment, string> = {
  positive: "bg-score-hot",
  neutral: "bg-fg-muted",
  negative: "bg-score-warm",
};

const SENTIMENT_WORD: Record<Sentiment, string> = {
  positive: "Speaks well of it",
  neutral: "Mentions it",
  negative: "Complains about it",
};

/** One post that named a competitor, with what it said and what it cost. */
export function MentionCard({ mention, cost }: MentionCardProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-card border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <AuthorAvatar name={mention.author} src={mention.avatarUrl} size={28} />
        <span className="text-small text-fg" style={{ fontWeight: 500 }}>
          u/{mention.author ?? "unknown"}
        </span>
        <SubredditChip name={mention.subreddit} iconUrl={mention.subredditIconUrl} />
        <span className="text-mono text-fg-muted">{relativeAge(mention.createdAt)}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-small text-fg-muted">
          <span
            className={cn("size-2 rounded-full", DOT[mention.sentiment])}
            aria-hidden="true"
          />
          {SENTIMENT_WORD[mention.sentiment]}
        </span>
      </div>
      <a
        href={mention.url}
        target="_blank"
        rel="noreferrer noopener"
        className="transition-motion text-h3 text-fg transition-colors hover:text-fg-muted"
        style={{ fontWeight: 500 }}
      >
        {mention.title}
      </a>
      {mention.summary ? (
        <p className="rounded-card bg-surface-2 p-3 text-small text-fg-muted">{mention.summary}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-mono text-fg-muted">about {mention.competitor}</span>
        {cost ? (
          <CostLine costUsd={cost.costUsd} sku={cost.sku} requestId={cost.requestId} />
        ) : (
          <span className="text-mono text-fg-muted">Answered from data already fetched</span>
        )}
      </div>
    </div>
  );
}
