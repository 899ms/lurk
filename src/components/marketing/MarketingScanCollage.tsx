"use client";
import { motion, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";
import { ScoreBadge } from "@/components/ScoreBadge";
import { AppMockLeads } from "./AppMockLeads";
import { SCAN_LEAD } from "./mockContent";
import { ThreadIdentity } from "./ThreadIdentity";

/** A search, the product window behind it, and the verdict card in front: the Aside memory collage. */
export function MarketingScanCollage() {
  const reduced = useReducedMotion();
  const enter = (delay: number) => ({
    initial: reduced ? false : { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: reduced ? 0 : 0.55, delay: reduced ? 0 : delay, ease: "easeOut" as const },
  });
  return (
    <section id="features" className="scan-collage" data-proof="scan">
      <header className="left-heading">
        <h2>
          <span>Scans</span> that read the whole thread.
        </h2>
        <p>
          Every keyword and community is searched on a schedule. Titles are filtered first,
          then the shortlisted posts and comments are read in full and scored with a written
          reason and the exact phrase that matched your product.{" "}
          <a href="#costs">See what a scan costs</a>
        </p>
      </header>
      <div className="collage">
        <motion.div className="collage-ask" {...enter(0)}>
          <Search />
          <span>
            ai form builder
            <small>reddit.search, sorted new, then r/nocode and r/GPT</small>
          </span>
        </motion.div>
        <motion.div className="collage-window" {...enter(0.25)} aria-hidden="true">
          <AppMockLeads />
        </motion.div>
        <motion.div className="collage-card" {...enter(0.6)}>
          <div className="fragment-title">
            <ThreadIdentity thread={SCAN_LEAD} />
            <ScoreBadge score={SCAN_LEAD.score} />
          </div>
          <a className="fragment-subject" href={SCAN_LEAD.url} target="_blank" rel="noreferrer">
            {SCAN_LEAD.title}
          </a>
          <p>{SCAN_LEAD.reason}</p>
          <mark>{SCAN_LEAD.matchedPhrase}</mark>
          <ol className="collage-steps">
            <li>Searched</li>
            <li>Kept by the title filter</li>
            <li>Read in full and scored</li>
          </ol>
          <small>Saved score, reason and phrase for this r/{SCAN_LEAD.subreddit} post.</small>
        </motion.div>
      </div>
    </section>
  );
}
