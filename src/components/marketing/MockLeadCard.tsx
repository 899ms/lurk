import { ArrowUp, Copy, ExternalLink, EyeOff, MessageCircle, PenLine, ThumbsDown } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { CostLine } from "@/components/CostLine";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SubredditChip } from "@/components/SubredditChip";
import { HighlightedBody } from "@/components/leads/HighlightedBody";
import { PromoPolicyBadge } from "@/components/leads/PromoPolicyBadge";
import { Button } from "@/components/ui/button";
import type { MockLead } from "./mockContent";

type MockLeadCardProps = { lead: MockLead };

const ICON = "size-3.5 text-fg-muted";

const ACTIONS = [
  { label: "Open on Reddit", icon: ExternalLink, variant: "outline" as const },
  { label: "Draft a reply", icon: PenLine, variant: "ghost" as const },
  { label: "Copy title", icon: Copy, variant: "ghost" as const },
  { label: "Hide", icon: EyeOff, variant: "ghost" as const },
  { label: "Not a fit", icon: ThumbsDown, variant: "ghost" as const },
];

/** One lead exactly as the feed renders it, with its actions beside it. */
export function MockLeadCard({ lead }: MockLeadCardProps) {
  return (
    <div className="flex gap-4 rounded-card border bg-surface p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <AuthorAvatar name={lead.author} src={lead.avatar} size={28} />
          <span className="text-small text-fg" style={{ fontWeight: 500 }}>
            u/{lead.author}
          </span>
          <SubredditChip name={lead.subreddit} iconUrl={lead.subredditIcon} />
          <span className="text-mono text-fg-muted">{lead.age}</span>
          <ScoreBadge score={lead.score} className="ml-auto" />
        </div>
        <h3 className="text-h3 text-fg" style={{ fontWeight: 500 }}>
          {lead.title}
        </h3>
        <p className="text-mono text-fg-muted">
          in r/{lead.subreddit} - {lead.stage}
        </p>
        <p className="rounded-card bg-surface-2 p-3 text-small text-fg-muted">{lead.reason}</p>
        <HighlightedBody text={lead.body} phrase={lead.matchedPhrase} />
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="inline-flex items-center gap-1 text-mono tabular-nums text-fg-muted">
            <ArrowUp className="size-3.5" aria-hidden="true" />
            {lead.points}
          </span>
          <span className="inline-flex items-center gap-1 text-mono tabular-nums text-fg-muted">
            <MessageCircle className="size-3.5" aria-hidden="true" />
            {lead.comments}
          </span>
          <PromoPolicyBadge policy={lead.promoRule} rulesText={null} />
          <CostLine costUsd={lead.costUsd} sku={lead.sku} requestId={lead.requestId} />
        </div>
      </div>
      <div className="hidden w-40 shrink-0 flex-col gap-1.5 lg:flex">
        {ACTIONS.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            size="sm"
            nativeButton={false}
            className="justify-start"
            render={
              <span>
                <action.icon className={ICON} aria-hidden="true" />
                {action.label}
              </span>
            }
          />
        ))}
      </div>
    </div>
  );
}
