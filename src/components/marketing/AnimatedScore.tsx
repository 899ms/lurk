"use client";
import { animate, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ScoreBadge } from "@/components/ScoreBadge";

export function AnimatedScore({ score }: { score: number }) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(score);
  useEffect(() => {
    if (reduced) return;
    const controls = animate(0, score, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, reduced]);
  return (
    <span
      className="ml-auto"
      aria-label={`Saved intent score ${score} out of 100`}
    >
      <span aria-hidden="true">
        <ScoreBadge score={reduced ? score : value} />
      </span>
    </span>
  );
}
