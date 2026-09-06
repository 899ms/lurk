import { Globe, MessageSquare } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { CostLine } from "@/components/CostLine";
import { BrandImage } from "./BrandImage";
import { AppMockSeo } from "./AppMockSeo";
import { AppMockUsage } from "./AppMockUsage";
import { MOCK_TIMELINE } from "./mockContent";

export function MarketingResearchSections() {
  return (
    <>
      <section className="feature-section feature-split" id="reddit-seo">
        <div className="section-copy">
          <span className="eyebrow">
            <BrandImage name="Google" src="/brands/google.svg" size={18} />
            Reddit SEO
          </span>
          <h2>
            Some conversations
            <br />
            keep getting found.
          </h2>
          <p>
            Find Reddit threads that Google ranks for your keywords. See the saved position, thread
            age, and whether a competitor is named.
          </p>
          <p>
            Connect an AnyAPI wallet for daily refreshes and monthly search volume. Free gets weekly
            refreshes, without volume.
          </p>
          <span className="inline-note">
            <Globe />
            Search context, next to Reddit context.
          </span>
        </div>
        <div className="product-mat">
          <AppMockSeo />
        </div>
      </section>
      <section className="feature-section" id="insights">
        <div className="section-intro">
          <span className="eyebrow">Competitors + Insights</span>
          <h2>
            Hear the pattern,
            <br />
            not just the mention.
          </h2>
          <p>
            Track competitor mentions with sentiment. Group the pain themes and communities in your
            saved leads, over data you already fetched.
          </p>
        </div>
        <div className="research-grid">
          <article className="research-card">
            <div className="brand-orbit">
              <BrandImage name="Jotform" domain="jotform.com" size={38} />
              <BrandImage name="Typeform" domain="typeform.com" size={38} />
              <BrandImage name="Tally" domain="tally.so" size={38} />
            </div>
            <h3>Understand the alternatives</h3>
            <p>Positive, neutral, or negative: see how people talk about the products you track.</p>
            <div className="sentiment-tags">
              <span>Positive</span>
              <span>Neutral</span>
              <span>Negative</span>
            </div>
            <small>Example products, not endorsements.</small>
          </article>
          <article className="research-card">
            <div className="avatar-stack">
              {MOCK_TIMELINE.map((person) => (
                <AuthorAvatar
                  key={person.author}
                  name={person.author}
                  src={person.avatar}
                  size={38}
                />
              ))}
            </div>
            <h3>Connect the recurring pains</h3>
            <p>
              Insights groups themes and communities. Not-fit reasons stay visible; they do not
              silently rewrite your filters.
            </p>
            <div className="theme-example">
              <MessageSquare />
              <span>
                Simpler tools for non-technical teams
                <small>Theme illustrated by the saved r/nocode thread</small>
              </span>
            </div>
          </article>
        </div>
      </section>
      <section className="feature-section feature-split" id="costs">
        <div className="section-copy">
          <span className="eyebrow">
            <BrandImage name="AnyAPI" src="/anyapi-mark.svg" size={18} />
            Data by AnyAPI
          </span>
          <h2>
            The data has a price.
            <br />
            You get to see it.
          </h2>
          <p>
            AnyAPI is a pay-per-call data marketplace. Every lead shows the calls behind it. Data
            usage separates fetched data from reused data.
          </p>
          <div className="cost-feature">
            <BrandImage name="AnyAPI" src="/anyapi-mark.svg" size={22} />
            <CostLine costUsd={0.0012} sku="reddit.search" />
          </div>
          <p>A daily scan of a 25 keyword project costs cents a day.</p>
          <a className="text-link" href="https://getanyapi.com">
            Explore AnyAPI <Globe />
          </a>
        </div>
        <div className="product-mat">
          <AppMockUsage />
        </div>
      </section>
    </>
  );
}
