/**
 * Invented content for the marketing app mock. A form builder called Formcraft
 * watching r/SaaS, r/startups and r/webdev. Nothing here is a real lead.
 */

export type MockLead = {
  initials: string;
  title: string;
  subreddit: string;
  score: number;
  age: string;
};

export const MOCK_LEADS: MockLead[] = [
  {
    initials: "PD",
    title: "Typeform pricing just went up again, what is everyone moving to?",
    subreddit: "SaaS",
    score: 94,
    age: "3h",
  },
  {
    initials: "MR",
    title: "Need conditional logic in a form without paying for an enterprise plan",
    subreddit: "startups",
    score: 91,
    age: "5h",
  },
  {
    initials: "JV",
    title: "Cleanest way to drop a multi step form into a Next.js site?",
    subreddit: "webdev",
    score: 88,
    age: "9h",
  },
  {
    initials: "AK",
    title: "Our onboarding survey is a Google Form and it shows",
    subreddit: "SaaS",
    score: 84,
    age: "14h",
  },
  {
    initials: "TS",
    title: "Any form builder with an API that is not an afterthought?",
    subreddit: "SaaS",
    score: 82,
    age: "1d",
  },
  {
    initials: "LB",
    title: "How are you collecting structured feedback from beta users?",
    subreddit: "startups",
    score: 76,
    age: "1d",
  },
  {
    initials: "CN",
    title: "Client wants file uploads and payment in one form. Build or buy?",
    subreddit: "webdev",
    score: 71,
    age: "2d",
  },
  {
    initials: "RO",
    title: "Is it still worth writing your own form handling in 2026?",
    subreddit: "webdev",
    score: 64,
    age: "2d",
  },
];

export const MOCK_DETAIL = {
  title: "Typeform pricing just went up again, what is everyone moving to?",
  subreddit: "SaaS",
  promoRule: "Self promo allowed in comments",
  author: "u/parker_draws",
  age: "3h ago",
  stage: "Comparing",
  reason:
    "Priced out of their current form tool this month and asking the room for a replacement. Names conditional logic as the thing they cannot lose.",
  bodyBefore:
    "We are a team of six and the seat pricing finally tipped over what the forms are worth to us. ",
  matchedPhrase: "I need something with conditional logic and a real API.",
  bodyAfter:
    " Ideally self serve. What are you all actually using and happy with? Willing to switch this week.",
  costUsd: 0.0012,
  sku: "reddit.search",
  requestId: "req_2f8c41ab",
};

export const MOCK_DRAFT =
  "Six seats is exactly where that pricing starts to sting. What does your logic look like right now, branching on one answer or a whole scoring path? That changes which of the cheaper options will actually hold up.";

export type MockSeoRow = {
  keyword: string;
  thread: string;
  subreddit: string;
  position: number;
  comments: number;
  rival: boolean;
};

export const MOCK_SEO_ROWS: MockSeoRow[] = [
  {
    keyword: "typeform alternative",
    thread: "What are you using instead of Typeform in 2026?",
    subreddit: "SaaS",
    position: 2,
    comments: 148,
    rival: true,
  },
  {
    keyword: "best form builder for startups",
    thread: "Form builder recommendations for a small team",
    subreddit: "startups",
    position: 4,
    comments: 61,
    rival: true,
  },
  {
    keyword: "conditional logic forms",
    thread: "Form tools that do branching without the upsell",
    subreddit: "webdev",
    position: 5,
    comments: 33,
    rival: false,
  },
  {
    keyword: "form api",
    thread: "Which form product has a usable API?",
    subreddit: "webdev",
    position: 9,
    comments: 27,
    rival: false,
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

export const MOCK_RAIL = [
  { label: "Engage", items: [{ name: "Leads", count: 38 }, { name: "Reddit SEO" }] },
  { label: "Research", items: [{ name: "Insights" }, { name: "Competitors" }] },
  { label: "Setup", items: [{ name: "Product" }, { name: "Data usage" }, { name: "Settings" }] },
] satisfies { label: string; items: { name: string; count?: number }[] }[];
