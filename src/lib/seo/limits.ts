import { capped } from "@/lib/tier";
import { TIERS, type TierLimits } from "@/lib/tiers";

/** What one tier may ask of Google, and how often. */
export type SeoSettings = {
  /** The problem phrasings this refresh will search, already cut to the tier. */
  phrasings: string[];
  refreshDays: number;
  searchVolume: boolean;
};

/**
 * A self-hosted instance has no limits at all, which `limitsFor` says with a
 * null; it then gets what a connected wallet gets, the same way scans do.
 */
export function seoSettings(limits: TierLimits | null, phrasings: string[]): SeoSettings {
  const effective = limits ?? TIERS.connected;
  return {
    phrasings: capped(phrasings, effective.seoKeywords),
    refreshDays: effective.seoRefreshDays,
    searchVolume: effective.seoSearchVolume,
  };
}
