import { MessageSquare, Search, ShieldCheck } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { SubredditChip } from "@/components/SubredditChip";
import { ScoreBadge } from "@/components/ScoreBadge";
import { CostLine } from "@/components/CostLine";
import { BrandImage } from "./BrandImage";
import { MOCK_DETAIL, MOCK_SEO, MOCK_TIMELINE, MOCK_USAGE_ROWS } from "./mockContent";

export type FragmentKind = "leads" | "seo" | "competitors" | "insights" | "usage" | "rule";

/** Small product fragments built from saved facts, never fabricated outcomes. */
export function MarketingFragment({ kind }: { kind: FragmentKind }) {
  if (kind === "leads")
    return (
      <div className="product-fragment">
        <div className="fragment-title">
          <BrandImage name="Reddit" src="/brands/reddit.svg" />
          Saved lead
          <ScoreBadge score={MOCK_DETAIL.score} />
        </div>
        <div className="fragment-person">
          <AuthorAvatar name={MOCK_DETAIL.author} src={MOCK_DETAIL.avatar} size={32} />
          <span>
            u/{MOCK_DETAIL.author}
            <SubredditChip name={MOCK_DETAIL.subreddit} iconUrl={MOCK_DETAIL.subredditIcon} />
          </span>
        </div>
        <a className="fragment-subject" href={MOCK_DETAIL.url} target="_blank" rel="noreferrer">
          {MOCK_DETAIL.title}
        </a>
        <p>{MOCK_DETAIL.reason}</p>
      </div>
    );
  if (kind === "seo")
    return (
      <div className="product-fragment">
        <div className="fragment-title">
          <BrandImage name="Google" src="/brands/google.svg" />
          Reddit SEO
          <Search />
        </div>
        <small>Saved results / Typeform alternatives</small>
        {MOCK_SEO.map((row) => (
          <div className="fragment-search-row" key={row.url}>
            <BrandImage name="Google" src="/brands/google.svg" size={16} />
            <span>
              <a href={row.url} target="_blank" rel="noreferrer">
                {row.title}
              </a>
              <SubredditChip name={row.subreddit} iconUrl={row.icon} />
            </span>
            <small>#{row.position}</small>
          </div>
        ))}
        <div className="fragment-tag">
          <BrandImage name="Typeform" domain="typeform.com" size={14} />
          Competitor named
        </div>
      </div>
    );
  if (kind === "competitors")
    return (
      <div className="product-fragment">
        <div className="fragment-title">
          Competitors
          <BrandImage name="Reddit" src="/brands/reddit.svg" />
        </div>
        <small>Example products to track</small>
        {[
          ["Jotform", "jotform.com"],
          ["Typeform", "typeform.com"],
          ["Tally", "tally.so"],
        ].map(([name, domain]) => (
          <div className="fragment-company" key={domain}>
            <BrandImage name={name} domain={domain} size={28} />
            <span>{name}</span>
            <Search />
          </div>
        ))}
        <p>Mentions are labeled positive, neutral, or negative.</p>
      </div>
    );
  if (kind === "insights")
    return (
      <div className="product-fragment">
        <div className="fragment-title">
          <MessageSquare />
          Insights
        </div>
        <div className="avatar-stack">
          {MOCK_TIMELINE.map((person) => (
            <AuthorAvatar key={person.author} name={person.author} src={person.avatar} size={32} />
          ))}
        </div>
        <span className="fragment-subject">Simpler tools for non-technical teams</span>
        <p>Theme illustrated by the saved r/nocode conversation.</p>
        <SubredditChip name={MOCK_DETAIL.subreddit} iconUrl={MOCK_DETAIL.subredditIcon} />
      </div>
    );
  if (kind === "rule")
    return (
      <div className="product-fragment rule-fragment">
        <div className="fragment-title">
          <ShieldCheck />
          Community policy
        </div>
        <SubredditChip name={MOCK_DETAIL.subreddit} iconUrl={MOCK_DETAIL.subredditIcon} />
        <span className="fragment-subject">{MOCK_DETAIL.promoRule}</span>
        <p>
          Paraphrased from this community&apos;s sidebar. Read the current rules before replying.
        </p>
        <a
          className="fragment-link"
          href="https://www.reddit.com/r/nocode/about/rules/"
          target="_blank"
          rel="noreferrer"
        >
          Read r/nocode rules
        </a>
      </div>
    );
  return (
    <div className="product-fragment">
      <div className="fragment-title">
        <BrandImage name="AnyAPI" src="/anyapi-mark.svg" />
        Data usage
      </div>
      <small>Measured per-call examples</small>
      {MOCK_USAGE_ROWS.map((row) => (
        <div className="fragment-cost-row" key={row.api}>
          <BrandImage name="AnyAPI" src="/anyapi-mark.svg" size={12} />
          <CostLine costUsd={Number(row.cost.slice(1))} sku={row.api} />
        </div>
      ))}
      <p>Fetched and reused data, shown separately.</p>
    </div>
  );
}
