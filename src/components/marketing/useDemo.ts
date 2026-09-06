"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useInView } from "motion/react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(notify: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

/**
 * The server cannot know the motion preference, so report "no preference"
 * during hydration and settle straight after. Reading it in an effect instead
 * would make the two renders disagree and React would throw the markup away.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/** One calm sequence; pause its clock outside the viewport or background tab. */
export function useDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (!inView || reduced || !visible) return;
    const timer = setInterval(() => setPhase((p) => (p + 1) % 4), 1400);
    return () => clearInterval(timer);
  }, [inView, reduced, visible]);
  return {
    ref,
    phase: reduced ? 3 : phase,
    reduced,
    active: inView && visible && !reduced,
  };
}
