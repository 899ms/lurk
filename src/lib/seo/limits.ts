import { capped } from "@/lib/tier";
import { TIERS, type TierLimits } from "@/lib/tiers";

/** What one tier may ask of Google, and how often. */
export type SeoSettings = {
  keywords: string[];
  refreshDays: number;
  searchVolume: boolean;
};

/**
 * A self-hosted instance has no limits at all, which `limitsFor` says with a
 * null; it then gets what a connected wallet gets, the same way scans do.
 */
export function seoSettings(limits: TierLimits | null, keywords: string[]): SeoSettings {
  const effective = limits ?? TIERS.connected;
  return {
    keywords: capped(keywords, effective.seoKeywords),
    refreshDays: effective.seoRefreshDays,
    searchVolume: effective.seoSearchVolume,
  };
}
