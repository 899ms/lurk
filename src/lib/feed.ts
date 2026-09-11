/** Feed vocabulary shared by the server queries and the client filter pills. */

import type { LeadKind } from "@/lib/scan/gates";

export type { LeadKind };

/**
 * `resolved` is written by the scan, not by the user: the person said in the
 * thread that their need is met, so the lead leaves the feed without pretending
 * the user judged it.
 */
export type LeadStatus = "new" | "hidden" | "not_fit" | "resolved";

/**
 * The date pills over the feed. Days, plus `all`: the first scan reaches back
 * a year, so the recent window that opens the feed is not everything there is.
 */
export const FEED_WINDOWS = [1, 7, 30, "all"] as const;

export type FeedWindow = (typeof FEED_WINDOWS)[number];

export type FeedFilter = {
  status: LeadStatus;
  days: FeedWindow;
  kind?: LeadKind;
  subreddit?: string;
  stage?: string;
  /** One Insights theme's label, narrowing the feed to the leads it holds. */
  theme?: string;
};

export type FeedFacets = { subreddits: string[]; stages: string[] };

export type LeadCost = { sku: string; costUsd: number; requestId: string | null };

/** One candidate the scan could not settle, as the leads page shows it. */
export type ReviewItem = {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  author: string | null;
  avatarUrl: string | null;
  authorKarma: number | null;
  authorCreatedAt: Date | null;
  subredditIconUrl: string | null;
  numComments: number | null;
  points: number | null;
  isComment: boolean;
  reason: string;
  reasonCodes: string[];
  fit: number | null;
  intent: number | null;
  needState: string;
  createdAt: Date;
  judgedAt: Date;
};
