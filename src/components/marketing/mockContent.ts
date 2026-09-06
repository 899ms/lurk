/**
 * Invented content for the marketing app mock. A form builder called Formcraft
 * watching r/SaaS, r/startups and r/webdev. Nothing here is a real lead, and no
 * avatar is a real Reddit account: the faces are drawn in public/art.
 */

import type { RankingThread } from "@/components/seo/OpportunityCard";
import type { RailIcon } from "@/components/Rail";

export type MockLead = {
  author: string;
  avatar: string;
  subreddit: string;
  subredditIcon: string;
  age: string;
  score: number;
  stage: string;
  title: string;
  reason: string;
  body: string;
  matchedPhrase: string;
  points: number;
  comments: number;
  promoRule: string;
  costUsd: number;
  sku: string;
  requestId: string;
};

export const MOCK_LEADS: MockLead[] = [
  {
    author: "parker_draws",
    avatar: "/art/snoo-1.svg",
    subreddit: "SaaS",
    subredditIcon: "/art/community-saas.svg",
    age: "3h ago",
    score: 94,
    stage: "comparing",
    title: "Typeform pricing just went up again, what is everyone moving to?",
    reason:
      "Priced out of their current form tool this month and asking the room for a replacement. Names conditional logic as the thing they cannot lose.",
    body: "We are a team of six and the seat pricing finally tipped over what the forms are worth to us. I need something with conditional logic and a real API. Ideally self serve. What are you all actually using and happy with? Willing to switch this week.",
    matchedPhrase: "I need something with conditional logic and a real API.",
    points: 41,
    comments: 63,
    promoRule: "Self promo allowed in comments",
    costUsd: 0.0012,
    sku: "reddit.search",
    requestId: "req_2f8c41ab",
  },
  {
    author: "mrivera_builds",
    avatar: "/art/snoo-2.svg",
    subreddit: "startups",
    subredditIcon: "/art/community-startups.svg",
    age: "5h ago",
    score: 91,
    stage: "solution seeking",
    title: "Need conditional logic in a form without paying for an enterprise plan",
    reason:
      "Has a working form today and one missing feature. Says the quote they were given is out of reach for a team this size.",
    body: "Onboarding survey branches three ways depending on the answer to question two. Every tool that does that wants an annual enterprise plan. Is there anything that does branching on a normal plan, or do I build it myself?",
    matchedPhrase: "Is there anything that does branching on a normal plan",
    points: 27,
    comments: 38,
    promoRule: "Self promo with disclosure",
    costUsd: 0.0012,
    sku: "reddit.search",
    requestId: "req_9d4b70ce",
  },
  {
    author: "jvaldez_dev",
    avatar: "/art/snoo-3.svg",
    subreddit: "webdev",
    subredditIcon: "/art/community-webdev.svg",
    age: "9h ago",
    score: 88,
    stage: "problem aware",
    title: "Cleanest way to drop a multi step form into a Next.js site?",
    reason:
      "Building for a client and weighing a hosted form against writing the handling themselves. Cares about the embed, not the brand.",
    body: "Client wants a four step intake form on a marketing site. I would rather not hand roll the state, the validation and the storage again. What are people embedding these days that does not fight the router?",
    matchedPhrase: "I would rather not hand roll the state, the validation and the storage again",
    points: 18,
    comments: 52,
    promoRule: "No self promo",
    costUsd: 0.0012,
    sku: "reddit.search",
    requestId: "req_51ea6fd0",
  },
];

/** The one lead the proof cards quote from. */
export const MOCK_DETAIL = MOCK_LEADS[0];

export const MOCK_DRAFT =
  "Six seats is exactly where that pricing starts to sting. What does your logic look like right now, branching on one answer or a whole scoring path? That changes which of the cheaper options will actually hold up.";

export type MockTimelineMark = { hour: number; author: string; avatar: string; subreddit: string };

/** Where today's faces sit on the scan strip, and what came in before today. */
export const MOCK_TIMELINE: MockTimelineMark[] = [
  { hour: 3, author: "jvaldez_dev", avatar: "/art/snoo-3.svg", subreddit: "webdev" },
  { hour: 7, author: "mrivera_builds", avatar: "/art/snoo-2.svg", subreddit: "startups" },
  { hour: 9, author: "parker_draws", avatar: "/art/snoo-1.svg", subreddit: "SaaS" },
  { hour: 14, author: "akira_ok", avatar: "/art/snoo-4.svg", subreddit: "SaaS" },
  { hour: 18, author: "tsong_hq", avatar: "/art/snoo-1.svg", subreddit: "webdev" },
];

export const MOCK_TIMELINE_EARLIER = ["Sep 4 +6", "Sep 3 +4"];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export type MockKeyword = {
  keyword: string;
  monthlyVolume: number | null;
  threads: RankingThread[];
};

export const MOCK_SEO_COST = { sku: "google.search", costUsd: 0.0009, requestId: "req_7c0a13de" };

export const MOCK_SEO_KEYWORDS: MockKeyword[] = [
  {
    keyword: "typeform alternative",
    monthlyVolume: null,
    threads: [
      {
        id: "seo-1",
        position: 1,
        competitorPresent: true,
        title: "What are you using instead of Typeform in 2026?",
        url: "https://www.reddit.com/r/SaaS/",
        subreddit: "SaaS",
        subredditIconUrl: "/art/community-saas.svg",
        score: 213,
        numComments: 148,
        createdAt: daysAgo(122),
      },
      {
        id: "seo-2",
        position: 3,
        competitorPresent: false,
        title: "Form builder recommendations for a small team",
        url: "https://www.reddit.com/r/startups/",
        subreddit: "startups",
        subredditIconUrl: "/art/community-startups.svg",
        score: 64,
        numComments: 61,
        createdAt: daysAgo(268),
      },
    ],
  },
  {
    keyword: "conditional logic forms",
    monthlyVolume: null,
    threads: [
      {
        id: "seo-3",
        position: 2,
        competitorPresent: true,
        title: "Form tools that do branching without the upsell",
        url: "https://www.reddit.com/r/webdev/",
        subreddit: "webdev",
        subredditIconUrl: "/art/community-webdev.svg",
        score: 51,
        numComments: 33,
        createdAt: daysAgo(74),
      },
      {
        id: "seo-4",
        position: 6,
        competitorPresent: false,
        title: "Which form product has a usable API?",
        url: "https://www.reddit.com/r/webdev/",
        subreddit: "webdev",
        subredditIconUrl: "/art/community-webdev.svg",
        score: 22,
        numComments: 27,
        createdAt: daysAgo(369),
      },
    ],
  },
];

export type MockUsageRow = {
  api: string;
  calls: number;
  reused: number;
  cost: string;
};

export const MOCK_USAGE_ROWS: MockUsageRow[] = [
  { api: "reddit.search", calls: 186, reused: 71, cost: "$0.14" },
  { api: "reddit.subreddit_posts", calls: 124, reused: 48, cost: "$0.09" },
  { api: "reddit.post_comments", calls: 84, reused: 32, cost: "$0.06" },
  { api: "reddit.subreddit_details", calls: 18, reused: 6, cost: "$0.02" },
];

export type MockRailGroup = {
  label: string;
  items: { name: string; icon: RailIcon; count?: number }[];
};

export const MOCK_RAIL: MockRailGroup[] = [
  {
    label: "Engage",
    items: [
      { name: "Leads", icon: "radar", count: 38 },
      { name: "Reddit SEO", icon: "search" },
    ],
  },
  {
    label: "Research",
    items: [
      { name: "Insights", icon: "lightbulb" },
      { name: "Competitors", icon: "swords" },
    ],
  },
  {
    label: "Setup",
    items: [
      { name: "Product", icon: "box" },
      { name: "Data usage", icon: "receipt" },
      { name: "Settings", icon: "settings" },
    ],
  },
];
