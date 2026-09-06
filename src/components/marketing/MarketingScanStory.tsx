"use client";
import { motion } from "motion/react";
import { Filter, ScanSearch, Check } from "lucide-react";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SCAN_LEAD } from "./mockContent";
import { SCAN_MISSES } from "./researchContent";
import { ThreadIdentity } from "./ThreadIdentity";
import { useDemo } from "./useDemo";
import { EyebrowLink } from "./EyebrowLink";

export function MarketingScanStory() {
  const { ref, phase, reduced, active } = useDemo();
  const titles = [
    SCAN_MISSES[0],
    { id: "kept", title: SCAN_LEAD.title, subreddit: SCAN_LEAD.subreddit },
    SCAN_MISSES[1],
  ];
  return (
    <section id="features" className="scan-story" data-proof="scan">
      <header className="centered-heading">
        <EyebrowLink href="#seo" pill>
          From a search to a reason
        </EyebrowLink>
        <h2>
          Read the right threads.
          <br />
          See why they made the cut.
        </h2>
        <p>
          Titles are filtered first. Shortlisted posts and comments get a score,
          a written reason, and the exact phrase that matched your product.
        </p>
      </header>
      <div
        className="scan-demo demo-stage"
        ref={ref}
        data-motion="scan"
        data-phase={phase}
        data-running={active}
      >
        <div className="demo-steps">
          <span>
            <ScanSearch /> Search
          </span>
          <span>
            <Filter /> Prefilter
          </span>
          <span>
            <Check /> Read + score
          </span>
        </div>
        <div className="scan-columns">
          <div className="scan-stream">
            <small>Saved titles / form-builder example</small>
            {titles.map((item, i) => (
              <motion.div
                key={item.id}
                className={`scan-title ${item.id === "kept" ? "scan-kept" : ""}`}
                animate={{
                  opacity: phase > 0 && item.id !== "kept" ? 0.35 : 1,
                  x: !reduced && phase === 0 ? (2 - i) * 8 : 0,
                }}
                transition={{ duration: reduced ? 0 : 0.4, ease: "easeOut" }}
              >
                <span>r/{item.subreddit}</span>
                <p>{item.title}</p>
                <small>
                  {phase > 0
                    ? item.id === "kept"
                      ? "Read the full thread"
                      : "Not a form-builder request"
                    : "Title received"}
                </small>
              </motion.div>
            ))}
          </div>
          <div className="scan-verdict">
            <div className="fragment-title">
              <ThreadIdentity thread={SCAN_LEAD} />
              <motion.span
                animate={{ opacity: phase >= 2 ? 1 : 0.25 }}
                transition={{ duration: reduced ? 0 : 0.4 }}
              >
                <ScoreBadge score={SCAN_LEAD.score} />
              </motion.span>
            </div>
            <a
              className="fragment-subject"
              href={SCAN_LEAD.url}
              target="_blank"
              rel="noreferrer"
            >
              {SCAN_LEAD.title}
            </a>
            <motion.div
              className="scan-reason"
              animate={{ opacity: phase >= 2 ? 1 : 0.3 }}
              transition={{ duration: reduced ? 0 : 0.6 }}
            >
              <small>Why this matches</small>
              <p>{SCAN_LEAD.reason}</p>
              <mark>{SCAN_LEAD.matchedPhrase}</mark>
            </motion.div>
            <small>
              Saved score and reason. Prefilter sequence illustrated with real
              titles.
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}
