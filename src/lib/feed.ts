/** Feed vocabulary shared by the server queries and the client filter pills. */

export type LeadStatus = "new" | "hidden" | "not_fit";

/** The date pills over the feed. Days, because the feed window is 30 days. */
export const FEED_WINDOWS = [1, 7, 30] as const;

export type FeedWindow = (typeof FEED_WINDOWS)[number];

export type FeedFilter = {
  status: LeadStatus;
  days: FeedWindow;
  subreddit?: string;
  stage?: string;
};

export type FeedFacets = { subreddits: string[]; stages: string[] };

export type LeadCost = { sku: string; costUsd: number; requestId: string | null };
