import { ArrowDown, ArrowUpRight, Check, ScanSearch } from "lucide-react";
import { MarketingNav } from "./MarketingNav";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingShowcase } from "./MarketingShowcase";
import { MarketingFeatures } from "./MarketingFeatures";
import { SelfHostBlock } from "./SelfHostBlock";
import { CtaRow } from "./CtaRow";
import { BrandImage } from "./BrandImage";
import type { Variant } from "./VariantSwitcher";
import "./marketing.css";

/** One feature story, with three reviewable hero compositions. */
export function MarketingPageLayout({ variant }: { variant: Variant }) {
  return (
    <main className={`marketing marketing-${variant}`}>
      <div className="marketing-hero cloud-stage">
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
              <span className="hero-reddit">
                <BrandImage name="Reddit" src="/brands/reddit.svg" size={42} />
                Reddit
              </span>
              <br className="hero-break" /> is looking for what you sell.
            </h1>
            <div className="hero-description">
              <p>Find the post. Understand the intent. Write a useful reply.</p>
              <p>Buyer signals, community rules, and the cost of the data - all on the lead.</p>
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
            <MarketingShowcase />
            <p className="preview-caption">Real saved Reddit examples. Preview, not a live feed.</p>
          </div>
        </section>
      </div>
      <div className="marketing-body">
        <section className="workflow-strip" aria-label="How it works">
          <div>
            <ScanSearch />
            <span>
              Find the ask<small>Posts and comments, not just mentions.</small>
            </span>
          </div>
          <div>
            <BrandImage name="Reddit" src="/brands/reddit.svg" size={24} />
            <span>
              Read the room<small>Intent, context, and the community rule.</small>
            </span>
          </div>
          <a href="#features">
            <ArrowDown />
            <span>
              Decide what to say<small>You copy the draft. You choose to reply.</small>
            </span>
          </a>
        </section>
        <MarketingFeatures />
        <SelfHostBlock />
        <section className="closing-cta cloud-stage">
          <span className="eyebrow">Good conversations start with listening</span>
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
