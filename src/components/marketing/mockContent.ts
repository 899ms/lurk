/**
 * Saved public examples read from the product Postgres on 2026-09-05:
 * leads + reddit_posts + reddit_comments + reddit_authors; SEO from
 * seo_opportunities + reddit_posts. Comment leads use the comment author.
 * Real r/nocode and r/Entrepreneur icons and the r/nocode sidebar policy came
 * from AnyAPI SDK reddit.subreddit_details on the same date ($0.0012 each).
 * Titles, permalinks, avatars, scores, reasons and phrases are real saved data.
 * Cost lines illustrate a measured call price, not total cost for these leads.
 * No synthetic identities, live counts, request IDs or current-rank claims.
 */
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
  url: string;
  reason: string;
  body: string;
  matchedPhrase: string;
  promoRule: string;
  costUsd: number;
  sku: string;
  kind: string;
};

export const MOCK_LEADS: MockLead[] = [
  {
    author: "driftmoose88",
    avatar: "https://i.redd.it/snoovatar/avatars/844c1f80-3dd6-42e5-9c6b-432481eda424-headshot.png",
    subreddit: "nocode",
    subredditIcon:
      "https://styles.redditmedia.com/t5_3gbip/styles/communityIcon_99qld76bwkle1.png?width=64&frame=1&auto=webp&s=8ae23376d057ff01792c2af164cbfad72a78f9df",
    age: "Saved Sep 2",
    score: 83,
    stage: "comparing",
    title: "Looking for a simpler Jotform alternative",
    url: "https://www.reddit.com/r/nocode/comments/1w5mqwf/looking_for_a_simpler_jotform_alternative/",
    reason:
      "They find Jotform overkill for basic surveys and asked for a simpler tool non-technical staff can manage.",
    body: "Looking for a Jotform alternative that's more focused on surveys/feedback",
    matchedPhrase: "Looking for a Jotform alternative that's more focused on surveys/feedback",
    promoRule: "No blatant self-promotion; contribute value",
    costUsd: 0.0012,
    sku: "reddit.search",
    kind: "Post",
  },
  {
    author: "jordanmiller81",
    avatar: "https://i.redd.it/snoovatar/avatars/00b115bf-9fbb-4b98-ae27-b1c14663f0d8-headshot.png",
    subreddit: "nocode",
    subredditIcon:
      "https://styles.redditmedia.com/t5_3gbip/styles/communityIcon_99qld76bwkle1.png?width=64&frame=1&auto=webp&s=8ae23376d057ff01792c2af164cbfad72a78f9df",
    age: "Saved Sep 2",
    score: 75,
    stage: "solution seeking",
    title: "Looking for a simpler Jotform alternative",
    url: "https://www.reddit.com/r/nocode/comments/1w5mqwf/looking_for_a_simpler_jotform_alternative/p7gb2jb/",
    reason:
      "Shares the pain of needing a simpler Jotform replacement and asks for an alternative too.",
    body: "I'm actually looking for an alternative too",
    matchedPhrase: "I'm actually looking for an alternative too",
    promoRule: "No blatant self-promotion; contribute value",
    costUsd: 0.0012,
    sku: "reddit.search",
    kind: "Comment",
  },
];

export const MOCK_DETAIL = MOCK_LEADS[0];
export const MOCK_TIMELINE = [
  {
    author: "driftmoose88",
    avatar: "https://i.redd.it/snoovatar/avatars/844c1f80-3dd6-42e5-9c6b-432481eda424-headshot.png",
    subreddit: "nocode",
  },
  {
    author: "jordanmiller81",
    avatar: "https://i.redd.it/snoovatar/avatars/00b115bf-9fbb-4b98-ae27-b1c14663f0d8-headshot.png",
    subreddit: "nocode",
  },
  {
    author: "akl773",
    avatar: "https://i.redd.it/snoovatar/avatars/755f90a8-7759-4e52-9bf3-f69f7295f175-headshot.png",
    subreddit: "nocode",
  },
];
export const MOCK_SEO = [
  {
    keyword: "Typeform alternatives",
    title: "Typeform Alternative",
    url: "https://www.reddit.com/r/Entrepreneur/comments/vyf9yd/typeform_alternative/",
    position: 1,
    competitorPresent: true,
    subreddit: "Entrepreneur",
    icon: "https://styles.redditmedia.com/t5_2qldo/styles/communityIcon_vbw2fy8csgz01.png?width=64&frame=1&auto=webp&s=f9d09673d8d4331f2bb74fc5ed05eb49110bc790",
    date: "2022-07-13",
  },
  {
    keyword: "Typeform alternatives",
    title: "Free typeform alternative?",
    url: "https://www.reddit.com/r/Entrepreneur/comments/1d11f7a/free_typeform_alternative/",
    position: 2,
    competitorPresent: true,
    subreddit: "Entrepreneur",
    icon: "https://styles.redditmedia.com/t5_2qldo/styles/communityIcon_vbw2fy8csgz01.png?width=64&frame=1&auto=webp&s=f9d09673d8d4331f2bb74fc5ed05eb49110bc790",
    date: "2024-05-26",
  },
];

export const MOCK_DRAFT =
  "For a nonprofit, I would start with who will own the forms when volunteers change. Do you need anonymous feedback, or a way to follow up with each person? That will help narrow the options.";

export const MOCK_USAGE_ROWS = [
  { api: "reddit.search", purpose: "Find matching threads", cost: "$0.0012" },
  { api: "reddit.post", purpose: "Read a full post", cost: "$0.0012" },
  { api: "reddit.post_comments", purpose: "Read the conversation", cost: "$0.0020" },
  { api: "google.search", purpose: "Find ranking Reddit threads", cost: "$0.0009" },
];

export const MOCK_RAIL: { label: string; items: { name: string; icon: RailIcon }[] }[] = [
  {
    label: "Discover",
    items: [
      { name: "Leads", icon: "radar" },
      { name: "Reddit SEO", icon: "search" },
    ],
  },
  {
    label: "Understand",
    items: [
      { name: "Competitors", icon: "swords" },
      { name: "Insights", icon: "lightbulb" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { name: "Product", icon: "box" },
      { name: "Data usage", icon: "receipt" },
      { name: "Settings", icon: "settings" },
    ],
  },
];
