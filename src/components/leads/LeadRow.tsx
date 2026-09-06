import Link from "next/link";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SubredditChip } from "@/components/SubredditChip";
import { relativeAge } from "@/components/leads/ScanStatus";
import type { FeedLead } from "@/lib/leads";
import { cn } from "@/lib/utils";

type LeadRowProps = { lead: FeedLead; href: string; selected: boolean };

function initialsOf(author: string | null): string {
  const parts = (author ?? "").split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

/** One line of the feed: who posted, what they said, where, and how hot. */
export function LeadRow({ lead, href, selected }: LeadRowProps) {
  const author = lead.commentAuthor ?? lead.author;
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "transition-motion flex items-start gap-2.5 border-b px-4 py-3 transition-colors",
        selected ? "bg-surface-2" : "hover:bg-surface-2",
      )}
    >
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] text-fg-muted">
        {initialsOf(author)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-small text-fg">{lead.title}</span>
        <SubredditChip name={lead.subreddit} />
      </span>
      <span className="flex shrink-0 items-center gap-2 pt-0.5">
        <ScoreBadge score={lead.score} />
        <span className="text-mono tabular-nums text-fg-muted">{relativeAge(lead.createdAt)}</span>
      </span>
    </Link>
  );
}
