import { ArrowUpRight, Check } from "lucide-react";
import { MarketingNav } from "./MarketingNav";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingShowcase } from "./MarketingShowcase";
import { MarketingFeatures } from "./MarketingFeatures";
import { MotionPanel } from "./MotionPanel";
import { CtaRow } from "./CtaRow";
import { BrandWord } from "./BrandWord";
import type { Variant } from "./VariantSwitcher";
import "./marketing.css";
import "./below-fold.css";
import "./round-three.css";
import "./round-four.css";

/** One feature story, with three reviewable hero compositions. */
export function MarketingPageLayout({ variant }: { variant: Variant }) {
  return (
    <main className={`marketing marketing-${variant}`}>
      <MotionPanel>
        <MarketingNav />
        <section className="hero-layout" aria-labelledby="marketing-title">
          <div className="hero-copy">
            <a className="hero-eyebrow" href="#self-host">
              <span className="status-dot" />
              Open source. Yours to run.
              <ArrowUpRight />
            </a>
            <h1 id="marketing-title">
              Someone on{" "}
              <BrandWord name="Reddit" />
              <br className="hero-break" /> is looking for what you sell.
            </h1>
            <div className="hero-description">
              <p>Find the post. Understand the intent. Write a useful reply.</p>
              <p>
                Buyer signals, community rules, and the cost of the data - all
                on the lead.
              </p>
            </div>
            <CtaRow />
            <div className="hero-promises">
              <span>
                <Check />
                Free hosted tier
              </span>
              <span>
                <Check />
                Never posts or DMs
              </span>
            </div>
          </div>
          <div className="hero-product">
            <p className="preview-caption">
              Real saved <BrandWord name="Reddit" /> examples. Preview, not a live feed.
            </p>
            <MarketingShowcase />
          </div>
        </section>
      </MotionPanel>
      <div className="marketing-body">
        <MarketingFeatures />
        <section className="closing-cta" data-proof="closing">
          <span className="closing-eyebrow">
            Good conversations start with listening
          </span>
          <h2>
            Find the ask.
            <br />
            Bring something useful.
          </h2>
          <CtaRow />
        </section>
        <MarketingFooter />
      </div>
    </main>
  );
}
