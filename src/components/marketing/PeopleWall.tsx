"use client";
import { useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { PEOPLE } from "./peopleContent";

/** Three staggered rows of real Reddit avatars, fading out at the bottom like a crowd. */
export function PeopleWall() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();
  return (
    <div
      ref={ref}
      className="people-wall"
      data-shown={visible || reduced}
      aria-label={`${PEOPLE.length} Reddit members whose posts became leads`}
    >
      {PEOPLE.map((person, index) => (
        <span className="people-face" style={{ "--i": index } as React.CSSProperties} key={person.username}>
          {/* Reddit CDN art; the Next image proxy adds nothing here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={person.avatarUrl} alt={`u/${person.username}`} loading="lazy" width={72} height={72} />
        </span>
      ))}
    </div>
  );
}
