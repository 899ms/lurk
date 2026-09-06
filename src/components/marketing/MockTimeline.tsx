"use client";
import { motion, useReducedMotion } from "motion/react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { MOCK_TIMELINE } from "./mockContent";

/** Real participants in the saved thread; no invented hours or lead totals. */
export function MockTimeline() {
  const reduced = useReducedMotion();
  return (
    <div className="mock-timeline">
      <div className="avatar-stack">
        {MOCK_TIMELINE.map((mark, index) => (
          <motion.span
            key={mark.author}
            title={`u/${mark.author}`}
            initial={reduced ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: reduced ? 0 : 0.4,
              delay: reduced ? 0 : index * 0.12,
              ease: "easeOut",
            }}
          >
            <AuthorAvatar name={mark.author} src={mark.avatar} size={30} />
          </motion.span>
        ))}
      </div>
      <span>One thread. More than one person asking.</span>
      <span className="mock-timeline-line" />
      <small>Saved conversation</small>
    </div>
  );
}
