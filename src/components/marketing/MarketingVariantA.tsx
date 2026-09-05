"use client";

import { useState } from "react";
import { PillTabs } from "@/components/PillTabs";
import { StatCard } from "@/components/StatCard";
import { AnyapiInline } from "./AnyapiInline";
import { AppMockLeads } from "./AppMockLeads";
import { AppMockSeo } from "./AppMockSeo";
import { AppMockUsage } from "./AppMockUsage";
import { ArtCard, type ArtKind } from "./ArtCard";
import { CtaRow } from "./CtaRow";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";
import { RedditDot } from "./RedditDot";
import { SectionHead } from "./SectionHead";
import { SelfHostBlock } from "./SelfHostBlock";

const TABS = [
  { id: "leads", label: "Leads" },
  { id: "seo", label: "Reddit SEO" },
  { id: "usage", label: "Data usage" },
];

type Feature = {
  eyebrow: string;
  title: string;
  lines: string[];
  art: { kind: ArtKind; eyebrow: string; title: string; body: string };
  stats: { label: string; value: string; caption: string }[];
};

const FEATURES: Feature[] = [
  {
    eyebrow: "Leads",
    title: "Scored, with the reason written out",
    lines: [
      "Every post and comment gets a score from 0 to 100.",
      "Next to it: one line saying why, and the phrase that earned it.",
    ],
    art: {
      kind: "leads",
      eyebrow: "Intent score",
      title: "You can argue with the score",
      body: "Problem aware, solution seeking, comparing, ready to buy. The reason is in plain words, so a bad call is obvious instead of mysterious.",
    },
    stats: [
      {
        label: "Every post and comment",
        value: "0-100",
        caption: "with a written reason and the matched phrase",
      },
      {
        label: "It never posts or DMs",
        value: "You reply",
        caption: "it never touches your Reddit account; you copy the reply",
      },
    ],
  },
  {
    eyebrow: "Communities",
    title: "That subreddit's own rule, on every lead",
    lines: [
      "Each subreddit writes its own self-promotion rule.",
      "We read it and put it on the lead, before you write a word.",
    ],
    art: {
      kind: "insights",
      eyebrow: "Promo policy",
      title: "Know the rule before you reply",
      body: "Allowed in comments, allowed with disclosure, or not at all. The rule sits next to the thread so a good lead never turns into a ban.",
    },
    stats: [
      {
        label: "Shown on every lead",
        value: "The rule",
        caption: "read from that subreddit's own rules, not guessed",
      },
      {
        label: "Licence",
        value: "MIT",
        caption: "open source, self-host it with your own key",
      },
    ],
  },
  {
    eyebrow: "Data usage",
    title: "A price tag on the lead itself",
    lines: [
      "Every lead shows what its data cost, down to the call.",
      "Calls answered from data already fetched cost nothing and say so.",
    ],
    art: {
      kind: "usage",
      eyebrow: "Cost per lead",
      title: "This lead cost $0.0012",
      body: "Nothing else in this category will tell you that. You pay AnyAPI catalog prices per call from your own wallet, and a daily scan of a 25 keyword project costs cents a day.",
    },
    stats: [
      {
        label: "This lead cost",
        value: "$0.0012",
        caption: "the AnyAPI catalog price for the call behind it",
      },
      {
        label: "Subscription",
        value: "None",
        caption: "you pay per call, from your own AnyAPI wallet",
      },
    ],
  },
];

/** Variant A: editorial split hero, a tabbed app mock, then feature sections. */
export function MarketingVariantA() {
  const [tab, setTab] = useState("leads");
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-8 py-8">
      <MarketingNav />
      <section className="grid gap-10 md:grid-cols-2 md:gap-12">
        <div className="flex flex-col gap-8">
          <h1 className="text-display text-balance" style={{ fontWeight: 500 }}>
            Find the Reddit threads asking for what you sell
          </h1>
          <CtaRow />
        </div>
        <div className="flex flex-col gap-3 self-end text-body text-fg-muted">
          <p>
            <RedditDot /> Reddit posts and comments, scored for buyer intent, with the reason
            written out.
          </p>
          <p>
            Every lead shows what its data cost from <AnyapiInline />, down to the call.
          </p>
          <p>Free, open source, and it never posts or DMs. You copy the reply.</p>
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <PillTabs tabs={TABS} activeId={tab} onSelect={setTab} className="self-start" />
        {tab === "leads" ? <AppMockLeads /> : null}
        {tab === "seo" ? <AppMockSeo /> : null}
        {tab === "usage" ? <AppMockUsage /> : null}
      </section>
      {FEATURES.map((feature) => (
        <section key={feature.title} className="flex flex-col gap-8">
          <SectionHead eyebrow={feature.eyebrow} title={feature.title} lines={feature.lines} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <ArtCard {...feature.art} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {feature.stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>
          </div>
        </section>
      ))}
      <SelfHostBlock />
      <MarketingFooter />
    </main>
  );
}
