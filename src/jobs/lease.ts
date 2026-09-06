/**
 * How long a claimed job may run without a sign of life before another worker
 * may take it back. The longest run measured on 2026-09-05 was a scan of about
 * four minutes, so fifteen minutes is that worst case with more than three
 * times the margin: a live job is never stolen, and a job whose process died is
 * picked up again within a quarter of an hour instead of blocking its project
 * forever.
 */
export const LEASE_MS = 15 * 60 * 1000;

/**
 * How often a running job re-stamps its lease. A lease expires after LEASE_MS
 * of silence, so renewing every fifth of that leaves four further attempts
 * before a live job could ever be reclaimed: one slow database call or one
 * missed tick cannot cost a running job its work. A process that dies stops
 * renewing, so the reclaim after LEASE_MS is unchanged.
 */
export const HEARTBEAT_MS = LEASE_MS / 5;
