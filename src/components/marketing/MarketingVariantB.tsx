import { StatCard } from "@/components/StatCard";
import { AnyapiInline } from "./AnyapiInline";
import { AppMockLeads } from "./AppMockLeads";
import { AppMockUsage } from "./AppMockUsage";
import { CtaRow } from "./CtaRow";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";
import { RedditDot } from "./RedditDot";
import { SectionHead } from "./SectionHead";
import { SelfHostBlock } from "./SelfHostBlock";

const LEDGER = [
  { label: "Spent this week", value: "$0.31", caption: "at AnyAPI catalog prices, no markup" },
  { label: "Calls", value: "412", caption: "each one with its own request id" },
  {
    label: "Answered from data already fetched",
    value: "38%",
    caption: "reused rows cost nothing and say so",
  },
];

const FEATURES = [
  {
    title: "Scored 0-100, with the reason",
    body: "Every post and comment gets a score, an intent stage, one line saying why, and the phrase that earned it. A bad call is obvious instead of mysterious.",
  },
  {
    title: "The subreddit's own promo rule",
    body: "Each community writes its own self-promotion rule. We read it and put it on every lead, so a good thread never turns into a ban.",
  },
  {
    title: "A price tag on every lead",
    body: "This lead cost $0.0012. The Data usage panel shows the same figure per call, per API, and per day, including the calls answered from data already fetched.",
  },
  {
    title: "It never posts, and never DMs",
    body: "It does not touch your Reddit account at all. It writes a draft in your voice and you copy the reply. That is the whole sending story.",
  },
  {
    title: "Reddit SEO on the same data",
    body: "The Reddit threads already ranking for what you sell, with their position and whether a rival is named in them. Search volume when a wallet is connected.",
  },
  {
    title: "Free, open source, self-hostable",
    body: "MIT licence, docker compose up, your own AnyAPI key. The hosted free tier runs the identical code on ours.",
  },
];

/** Variant B: the ledger is the argument. Numbers first, features as a list. */
export function MarketingVariantB() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-8 py-8">
      <MarketingNav />
      <section className="flex flex-col gap-8">
        <div className="grid gap-6 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-12">
          <h1 className="text-display text-balance" style={{ fontWeight: 500 }}>
            Reddit lead finding, priced like data instead of software
          </h1>
          <div className="flex flex-col gap-3 self-end text-body text-fg-muted">
            <p>
              <RedditDot /> It finds the Reddit threads asking for what you sell, scores them, and
              tells you why.
            </p>
            <p>
              Then it shows what the data cost from <AnyapiInline />, down to the call.
            </p>
            <p>Free and open source. The rest of this category charges $19 to $79 a month.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {LEDGER.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
        <p className="max-w-3xl text-body text-fg-muted">
          That is a real week of scanning, at catalog prices, from your own wallet. A daily scan of
          a 25 keyword project costs cents a day. Nothing else in the category will show you this
          number, because the number is the argument.
        </p>
        <CtaRow />
        <AppMockLeads />
      </section>
      <section className="flex flex-col gap-8">
        <SectionHead
          eyebrow="What it does"
          title="Nine features, no plan to pick"
          lines={[
            "Everything is on in every tier.",
            "Connecting an AnyAPI wallet buys freshness and breadth: hourly scans, comments on every thread, Reddit SEO with search volume, and the API.",
          ]}
        />
        <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-2 border-t pt-4">
              <h3 className="text-h3" style={{ fontWeight: 500 }}>
                {feature.title}
              </h3>
              <p className="text-body text-fg-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-8">
        <SectionHead
          eyebrow="Data usage"
          title="Where the number comes from"
          lines={[
            "Every call is a line, with its API, its cost and its request id.",
            "Calls answered from data already fetched cost nothing and are counted separately.",
          ]}
        />
        <AppMockUsage />
      </section>
      <SelfHostBlock />
      <MarketingFooter />
    </main>
  );
}
