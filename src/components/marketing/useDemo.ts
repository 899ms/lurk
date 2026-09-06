"use client";
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/** One calm sequence; pause its clock outside the viewport or background tab. */
export function useDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduced = useReducedMotion();
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
