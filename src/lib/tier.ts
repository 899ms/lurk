import { walletConnection } from "./anyapi";
import { config } from "./config";
import { limitsFor, TIERS, type TierLimits, type TierName } from "./tiers";

export type UserTier = { name: TierName; limits: TierLimits | null };

/** Which tier a user is on, and the limits that go with it. */
export async function tierForUser(userId: string): Promise<UserTier> {
  const name: TierName = (await walletConnection(userId)) ? "connected" : "free";
  return { name, limits: limitsFor(name, config().SELF_HOSTED) };
}

/** Hours between scheduled scans; a self-hosted instance scans hourly. */
export function scanIntervalHours(limits: TierLimits | null): number {
  return limits?.scanIntervalHours ?? TIERS.connected.scanIntervalHours;
}

/** Trims a list to a tier cap, keeping the model's own ordering. */
export function capped<T>(values: T[], limit: number | null | undefined): T[] {
  return limit == null ? values : values.slice(0, limit);
}
