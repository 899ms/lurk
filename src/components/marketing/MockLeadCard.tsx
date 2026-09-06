import { ExternalLink, ShieldCheck } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { CostLine } from "@/components/CostLine";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SubredditChip } from "@/components/SubredditChip";
import { BrandImage } from "./BrandImage";
import type { MockLead } from "./mockContent";

/** Real saved content; the cost is explicitly a per-call illustration. */
export function MockLeadCard({ lead }: { lead: MockLead }) {
  return (
    <article className="mock-lead">
      <div className="mock-identity">
        <AuthorAvatar name={lead.author} src={lead.avatar} size={30} />
        <span>u/{lead.author}</span>
        <SubredditChip name={lead.subreddit} iconUrl={lead.subredditIcon} />
        <ScoreBadge score={lead.score} className="ml-auto" />
      </div>
      <a className="mock-lead-title" href={lead.url} target="_blank" rel="noreferrer">
        {lead.title}
        <ExternalLink />
      </a>
      <div className="mock-meta">
        {lead.kind} / {lead.stage} / {lead.age}
      </div>
      <p className="mock-reason">{lead.reason}</p>
      <p className="mock-phrase">
        <mark>{lead.matchedPhrase}</mark>
      </p>
      <div className="mock-policy">
        <ShieldCheck />
        <span>{lead.promoRule}</span>
      </div>
      <div className="mock-cost">
        <BrandImage name="AnyAPI" src="/anyapi-mark.svg" size={14} />
        <CostLine costUsd={lead.costUsd} sku={lead.sku} />
        <span> / call example</span>
      </div>
    </article>
  );
}
