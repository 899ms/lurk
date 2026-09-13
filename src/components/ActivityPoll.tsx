"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * How often a page reloads its own server data while a job is working. A
 * running job writes one progress line per batch of work it finishes, which is
 * seconds apart, so five seconds shows each new line while it still means
 * something and asks the server for twelve renders a minute at most. Nothing
 * polls when nothing is happening.
 */
const POLL_MS = 5000;

/** Re-reads the page from the server while this project has work in flight. */
export function ActivityPoll({ busy }: { busy: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!busy) {
      return;
    }
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [busy, router]);
  return null;
}
