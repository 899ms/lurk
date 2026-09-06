"use client";
import { LayoutGroup, motion } from "motion/react";
import { ArrowDown, LockKeyhole, Search } from "lucide-react";
import { BrandImage } from "./BrandImage";
import { SubredditChip } from "@/components/SubredditChip";
import { SEO_THREADS } from "./researchContent";
import { useDemo } from "./useDemo";
import { EyebrowLink } from "./EyebrowLink";

export function MarketingSeoStory() {
  const { ref, phase, reduced, active } = useDemo();
  return (
    <section id="seo" className="seo-story" data-proof="seo">
      <header className="research-heading">
        <EyebrowLink href="#drafts">Reddit SEO</EyebrowLink>
        <h2>
          A reply can outlive
          <br />
          the day you write it.
        </h2>
        <p>
          These threads already rank for what you sell, and search results
          increasingly point people at the discussion itself. A useful answer
          there keeps being read long after the day you write it. lurk shows you
          the position it saved; it does not promise to move it.
        </p>
        <a
          className="fragment-link"
          href="https://blog.google/products-and-platforms/products/search/explore-web-generative-ai-search/"
          target="_blank"
          rel="noreferrer"
        >
          How Google surfaces discussion perspectives
        </a>
      </header>
      <div
        className="seo-demo demo-stage"
        ref={ref}
        data-motion="seo"
        data-phase={phase}
        data-running={active}
      >
        <LayoutGroup id="seo-transfer">
          <div className="seo-loop">
            <div className="google-fragment">
              <div className="google-query">
                <BrandImage name="Google" src="/brands/google.svg" size={26} />
                <span>{SEO_THREADS[0].keyword}</span>
                <Search size={18} />
              </div>
              <small>Saved Google results / {SEO_THREADS[0].observed}</small>
              {SEO_THREADS.map((row, i) => (
                <div
                  className={`google-result ${phase >= 1 ? "result-highlight" : ""}`}
                  key={row.url}
                >
                  <div className="result-site">
                    <BrandImage
                      name="Reddit"
                      src="/brands/reddit.svg"
                      size={18}
                    />
                    <span>Reddit / r/{row.subreddit}</span>
                    {phase < 2 ? (
                      <motion.span
                        layoutId={`rank-${i}`}
                        className="position-pill"
                        transition={{
                          duration: reduced ? 0 : 0.5,
                          ease: "easeOut",
                        }}
                      >
                        #{row.position}
                      </motion.span>
                    ) : (
                      <span className="position-placeholder">
                        #{row.position}
                      </span>
                    )}
                  </div>
                  <a href={row.url} target="_blank" rel="noreferrer">
                    {row.title}
                  </a>
                  <p>Public discussion with {row.comments} saved comments.</p>
                </div>
              ))}
            </div>
            <div className="seo-flow-label">
              <ArrowDown />
              <span>The same thread. More context.</span>
            </div>
            <div className="seo-table-fragment">
              <div className="fragment-title">
                <BrandImage name="Reddit" src="/brands/reddit.svg" />
                lurk / Reddit SEO
              </div>
              <div
                className="seo-data-table"
                role="table"
                aria-label="Saved Reddit SEO opportunities"
              >
                <div className="seo-data-row seo-data-head" role="row">
                  <span role="columnheader">Thread</span>
                  <span role="columnheader">Position</span>
                  <span role="columnheader">Age</span>
                  <span role="columnheader">Comments</span>
                  <span role="columnheader">Competitor</span>
                  <span role="columnheader">Monthly volume</span>
                </div>
                {SEO_THREADS.map((row, i) => (
                  <div className="seo-data-row" role="row" key={row.url}>
                    <span role="cell">
                      <a href={row.url} target="_blank" rel="noreferrer">
                        {row.title}
                      </a>
                      <SubredditChip name={row.subreddit} iconUrl={row.icon} />
                    </span>
                    <span role="cell">
                      {phase >= 2 ? (
                        <motion.span
                          layoutId={`rank-${i}`}
                          className="position-pill"
                          transition={{
                            duration: reduced ? 0 : 0.5,
                            ease: "easeOut",
                          }}
                        >
                          #{row.position}
                        </motion.span>
                      ) : (
                        <span className="position-placeholder">
                          #{row.position}
                        </span>
                      )}
                    </span>
                    <span role="cell">
                      {row.ageDays.toLocaleString("en-US")} days
                    </span>
                    <span role="cell">{row.comments}</span>
                    <span role="cell" className="seo-competitor">
                      <BrandImage
                        name={row.competitor}
                        domain={row.domain}
                        size={18}
                      />
                      {row.competitorPresent ? "Named" : "Not detected"}
                    </span>
                    <span role="cell" className="locked-volume">
                      <LockKeyhole size={14} />
                      Connect wallet
                    </span>
                  </div>
                ))}
              </div>
              <p className="demo-note">
                Age, comments and position at the saved observation. Monthly
                volume with a connected wallet.
              </p>
            </div>
          </div>
        </LayoutGroup>
      </div>
    </section>
  );
}
