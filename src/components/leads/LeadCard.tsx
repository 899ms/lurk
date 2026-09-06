"use client";

import { useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { Avatar } from "@/components/Avatar";
import { CostLine } from "@/components/CostLine";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SubredditChip } from "@/components/SubredditChip";
import { HighlightedBody } from "@/components/leads/HighlightedBody";
import { LeadActions } from "@/components/leads/LeadActions";
import { PromoPolicyBadge } from "@/components/leads/PromoPolicyBadge";
import { relativeAge } from "@/components/leads/ScanStatus";
import type { LeadCost } from "@/lib/feed";

export type CardLead = {
  id: string;
  score: number;
  fit: number | null;
  intent: number | null;
  engagement: number | null;
  stage: string | null;
  reason: string | null;
  matchedPhrase: string | null;
  title: string;
  url: string;
  subreddit: string;
  subredditIconUrl: string | null;
  promoPolicy: string | null;
  rulesText: string | null;
  imageUrl: string | null;
  numComments: number | null;
  points: number | null;
  createdAt: Date;
  body: string;
  author: string | null;
  avatarUrl: string | null;
  isComment: boolean;
  postAuthor: string | null;
  postAuthorAvatar: string | null;
};

type LeadCardProps = { lead: CardLead; projectId: string; cost: LeadCost | null };

const EXCERPT_CHARS = 320;

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-mono text-fg-muted">{label}</span>
      <span className="text-small tabular-nums text-fg">{value ?? "-"}</span>
    </span>
  );
}

/** One lead, from who posted it down to what its data cost. Click to expand. */
export function LeadCard({ lead, projectId, cost }: LeadCardProps) {
  const [open, setOpen] = useState(false);
  const text = open || lead.body.length <= EXCERPT_CHARS ? lead.body : `${lead.body.slice(0, EXCERPT_CHARS)}...`;
  const stage = lead.stage ? lead.stage.replace(/_/g, " ") : null;

  return (
    <div className="flex gap-4 rounded-card border bg-surface p-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(!open);
          }
        }}
        aria-expanded={open}
        className="flex min-w-0 flex-1 flex-col gap-2.5 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <AuthorAvatar name={lead.author} src={lead.avatarUrl} size={28} />
          <span className="text-small text-fg" style={{ fontWeight: 500 }}>
            u/{lead.author ?? "unknown"}
          </span>
          <SubredditChip name={lead.subreddit} iconUrl={lead.subredditIconUrl} />
          <span className="text-mono text-fg-muted">{relativeAge(lead.createdAt)}</span>
          <ScoreBadge score={lead.score} className="ml-auto" />
        </div>

        <h3 className="text-h3 text-fg" style={{ fontWeight: 500 }}>
          {lead.title}
        </h3>
        <p className="text-mono text-fg-muted">
          in r/{lead.subreddit}
          {stage ? ` - ${stage}` : ""}
        </p>

        {lead.isComment ? (
          <div className="flex items-center gap-2 rounded-control bg-surface-2 px-2 py-1 text-mono text-fg-muted">
            <Avatar name={lead.postAuthor} src={lead.postAuthorAvatar} size={16} />
            <span className="truncate">Replying in: {lead.title}</span>
          </div>
        ) : null}

        {lead.reason ? (
          <p className="rounded-card bg-surface-2 p-3 text-small text-fg-muted">{lead.reason}</p>
        ) : null}

        {text ? (
          <HighlightedBody text={text} phrase={lead.matchedPhrase} />
        ) : (
          <p className="text-body text-fg-muted">A title only, with no text of its own.</p>
        )}

        {open ? (
          <div className="flex gap-6 pt-1">
            <Metric label="Fit" value={lead.fit} />
            <Metric label="Intent" value={lead.intent} />
            <Metric label="Engagement" value={lead.engagement} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="inline-flex items-center gap-1 text-mono tabular-nums text-fg-muted">
            <ArrowUp className="size-3.5" aria-hidden="true" />
            {lead.points ?? 0}
          </span>
          <span className="inline-flex items-center gap-1 text-mono tabular-nums text-fg-muted">
            <MessageCircle className="size-3.5" aria-hidden="true" />
            {lead.numComments ?? 0}
          </span>
          <PromoPolicyBadge policy={lead.promoPolicy} rulesText={lead.rulesText} />
          {cost ? (
            <CostLine costUsd={cost.costUsd} sku={cost.sku} requestId={cost.requestId} />
          ) : (
            <span className="text-mono text-fg-muted">Answered from data already fetched</span>
          )}
        </div>
      </div>

      {lead.imageUrl ? (
        // Reddit serves post images from several CDN hosts we do not control.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lead.imageUrl}
          alt=""
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-control border object-cover"
        />
      ) : null}

      <LeadActions projectId={projectId} leadId={lead.id} url={lead.url} title={lead.title} />
    </div>
  );
}
