import { CostLine } from "@/components/CostLine";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SubredditChip } from "@/components/SubredditChip";
import { AppMockLeads } from "./AppMockLeads";
import { ArtCard } from "./ArtCard";
import { CtaRow } from "./CtaRow";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";
import { ProofCard } from "./ProofCard";
import { SelfHostBlock } from "./SelfHostBlock";
import { MOCK_DETAIL } from "./mockContent";

/** Variant C: the feed is the pitch. Proof points carry the real UI elements. */
export function MarketingVariantC() {
  return (
    <main className="flex w-full flex-col gap-16 py-8">
      <div className="flex flex-col gap-10 px-8">
        <MarketingNav />
        <div className="flex flex-col items-start gap-6">
          <h1 className="max-w-4xl text-display text-balance" style={{ fontWeight: 500 }}>
            This is what someone asking for what you sell looks like
          </h1>
          <p className="max-w-2xl text-body text-fg-muted">
            Free and open source. It scores Reddit posts and comments for buyer intent, says why,
            and shows what each lead cost to find.
          </p>
          <CtaRow />
        </div>
      </div>
      <div className="px-8">
        <AppMockLeads />
      </div>
      <div className="grid gap-4 px-8 lg:grid-cols-3">
        <ProofCard
          eyebrow="Scored"
          title="0 to 100, and it tells you why"
          body="Every post and comment is scored for buyer intent, with an intent stage, one line of reasoning, and the phrase that earned it."
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ScoreBadge score={94} />
              <span className="text-mono text-fg-muted">Comparing</span>
            </div>
            <p className="text-small text-fg-muted">{MOCK_DETAIL.reason}</p>
            <mark className="w-fit rounded-sm bg-score-warm/30 px-1 text-small text-fg">
              {MOCK_DETAIL.matchedPhrase}
            </mark>
          </div>
        </ProofCard>
        <ProofCard
          eyebrow="Communities"
          title="The subreddit's rule, on every lead"
          body="Each community writes its own self-promotion rule. We read it and show it next to the thread, so a good lead never turns into a ban."
        >
          <div className="flex flex-col gap-2">
            <SubredditChip name={MOCK_DETAIL.subreddit} />
            <span className="w-fit rounded-control border bg-surface px-2 py-1 text-mono text-fg-muted">
              {MOCK_DETAIL.promoRule}
            </span>
            <p className="text-small text-fg-muted">
              It never posts, never DMs, and never touches your Reddit account. You copy the reply.
            </p>
          </div>
        </ProofCard>
        <ProofCard
          eyebrow="Data usage"
          title="A price tag on every lead"
          body="The Data usage panel shows what the week cost per call and per API, and how much of it was answered from data already fetched."
        >
          <div className="flex flex-col gap-2">
            <CostLine
              costUsd={MOCK_DETAIL.costUsd}
              sku={MOCK_DETAIL.sku}
              requestId={MOCK_DETAIL.requestId}
            />
            <span className="text-mono text-fg-muted">
              38% of calls answered from data already fetched
            </span>
            <p className="text-small text-fg-muted">
              AnyAPI catalog prices from your own wallet. No subscription, no markup.
            </p>
          </div>
        </ProofCard>
      </div>
      <div className="px-8">
        <ArtCard
          kind="leads"
          eyebrow="Reddit SEO, Insights, API"
          title="Connecting a wallet buys freshness, not features"
          body="Hourly scans, comments on every thread, Reddit SEO with search volume, and the API. You pay AnyAPI catalog prices per call. A daily scan of a 25 keyword project costs cents a day."
        />
      </div>
      <div className="flex flex-col gap-16 px-8">
        <SelfHostBlock />
        <MarketingFooter />
      </div>
    </main>
  );
}
