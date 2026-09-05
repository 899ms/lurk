/**
 * Tier limits from the product plan. Free is the hosted anonymous-wallet tier;
 * connected is a user who authorized an AnyAPI wallet. Self-host has no limits
 * at all, which `limitsFor` expresses by returning null.
 */
export type TierName = "free" | "connected";

export type TierLimits = {
  projects: number | null;
  keywordsPerProject: number | null;
  subredditsPerProject: number | null;
  scanIntervalHours: number;
  commentThreadsPerScan: number | null;
  feedWindowDays: number;
  alertWebhooks: number | null;
  alertCadence: "daily" | "hourly";
  seoKeywords: number | null;
  seoRefreshDays: number;
  seoSearchVolume: boolean;
  competitors: number | null;
  apiRequestsPerDay: number;
};

export const TIERS: Record<TierName, TierLimits> = {
  free: {
    projects: 2,
    keywordsPerProject: 25,
    subredditsPerProject: 10,
    scanIntervalHours: 6,
    commentThreadsPerScan: 20,
    feedWindowDays: 30,
    alertWebhooks: 1,
    alertCadence: "daily",
    seoKeywords: 10,
    seoRefreshDays: 7,
    seoSearchVolume: false,
    competitors: 3,
    apiRequestsPerDay: 1000,
  },
  connected: {
    projects: null,
    keywordsPerProject: null,
    subredditsPerProject: null,
    scanIntervalHours: 1,
    commentThreadsPerScan: null,
    feedWindowDays: 30,
    alertWebhooks: null,
    alertCadence: "hourly",
    seoKeywords: null,
    seoRefreshDays: 1,
    seoSearchVolume: true,
    competitors: null,
    apiRequestsPerDay: 10000,
  },
};

/** Days shared Reddit rows are kept from their creation time. */
export const RETENTION_DAYS = 30;

/** Null means "no limit", which is what a self-hosted instance always gets. */
export function limitsFor(tier: TierName, selfHosted: boolean): TierLimits | null {
  return selfHosted ? null : TIERS[tier];
}
