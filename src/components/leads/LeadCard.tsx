"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { Avatar } from "@/components/Avatar";
import { DraftPanel } from "@/components/drafts/DraftPanel";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SubredditChip } from "@/components/SubredditChip";
import { HighlightedBody } from "@/components/leads/HighlightedBody";
import { LeadActions } from "@/components/leads/LeadActions";
import { PromoPolicyBadge } from "@/components/leads/PromoPolicyBadge";
import { Meter } from "@/components/leads/Meter";
import { StageChip } from "@/components/leads/StageChip";
import { relativeAge } from "@/lib/format";

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

type LeadCardProps = { lead: CardLead; projectId: string };

const EXCERPT_CHARS = 320;

/** One lead in the stream: who posted it, what they said, and how it scored. */
export function LeadCard({ lead, projectId }: LeadCardProps) {
  const [open, setOpen] = useState(false);
  const [draftRequests, setDraftRequests] = useState(0);
  const [thumbnail, setThumbnail] = useState<"pending" | "ok" | "broken">("pending");
  const draftRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (draftRequests > 0) {
      draftRef.current?.querySelector("textarea")?.focus();
    }
  }, [draftRequests]);

  function draftReply() {
    setOpen(true);
    setDraftRequests((count) => count + 1);
  }

  const text =
    open || lead.body.length <= EXCERPT_CHARS ? lead.body : `${lead.body.slice(0, EXCERPT_CHARS)}...`;

  return (
    <div className="flex flex-col gap-4 rounded-card border bg-surface p-4">
      <div className="flex gap-4">
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
            <StageChip stage={lead.stage} />
            <ScoreBadge score={lead.score} className="ml-auto" />
          </div>

          <h3 className="text-h3 text-fg" style={{ fontWeight: 500 }}>
            {lead.title}
          </h3>

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

          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 pt-1">
            <Meter label="Fit" value={lead.fit} />
            <Meter label="Intent" value={lead.intent} />
            <Meter label="Engagement" value={lead.engagement} />
            <span className="inline-flex items-center gap-1 text-mono tabular-nums text-fg-muted">
              <ArrowUp className="size-3.5" aria-hidden="true" />
              {lead.points ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-mono tabular-nums text-fg-muted">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              {lead.numComments ?? 0}
            </span>
            <PromoPolicyBadge policy={lead.promoPolicy} rulesText={lead.rulesText} />
          </div>
        </div>

        {lead.imageUrl && thumbnail !== "broken" ? (
          // Reddit serves post images from several CDN hosts we do not control,
          // and plenty of them are already gone. The frame appears only once the
          // picture itself has decoded, so a dead link leaves no broken box.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lead.imageUrl}
            alt=""
            width={56}
            height={56}
            ref={(node) => {
              if (node?.complete) {
                setThumbnail(node.naturalWidth > 0 ? "ok" : "broken");
              }
            }}
            onLoad={() => setThumbnail("ok")}
            onError={() => setThumbnail("broken")}
            className={
              thumbnail === "ok"
                ? "size-14 shrink-0 rounded-control border object-cover"
                : "hidden"
            }
          />
        ) : null}

        <LeadActions
          projectId={projectId}
          leadId={lead.id}
          url={lead.url}
          title={lead.title}
          onDraft={draftReply}
        />
      </div>

      {open ? (
        <div ref={draftRef}>
          <DraftPanel
            projectId={projectId}
            leadId={lead.id}
            subreddit={lead.subreddit}
            promoPolicy={lead.promoPolicy}
          />
        </div>
      ) : null}
    </div>
  );
}
