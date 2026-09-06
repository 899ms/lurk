"use client";
import type { ReactNode } from "react";
import { useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";

export function MotionPanel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const reduced = useReducedMotion();
  return (
    <div
      ref={ref}
      className="marketing-hero cloud-stage"
      data-drifting={visible && !reduced}
    >
      {children}
    </div>
  );
}
