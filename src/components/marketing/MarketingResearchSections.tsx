import { MessageSquare, Tags } from "lucide-react";
import { EyebrowLink } from "./EyebrowLink";
import { BrandImage } from "./BrandImage";
import { ThreadIdentity } from "./ThreadIdentity";
import { MENTION_THREAD } from "./mockContent";
import { SAVED_THEMES } from "./researchContent";

export function MarketingResearchSections() {
  return (
    <section id="insights" className="research-section" data-proof="research">
      <header className="research-heading">
        <EyebrowLink href="#api">Patterns, not another feed</EyebrowLink>
        <h2>What keeps coming up?</h2>
        <p>
          Read themes across saved leads, then inspect what people say about
          competitors. These are saved database records, not placeholder
          categories.
        </p>
      </header>
      <div className="evidence-grid">
        <div className="theme-evidence">
          <div className="fragment-title">
            <Tags />
            Insights / saved pain themes
          </div>
          {SAVED_THEMES.map((theme) => (
            <article key={theme.label}>
              <h3>{theme.label}</h3>
              <p>{theme.summary}</p>
            </article>
          ))}
          <small>
            Generated from the saved form-builder leads. Not-fit reasons do not
            rewrite your filters.
          </small>
        </div>
        <div className="mention-evidence">
          <div className="fragment-title">
            <MessageSquare />
            Competitor mention<span className="sentiment-label">Negative</span>
          </div>
          <div className="tracked-product">
            <BrandImage
              name="Google Forms"
              domain="forms.google.com"
              size={28}
            />
            Google Forms<span>Named competitor</span>
          </div>
          <ThreadIdentity thread={MENTION_THREAD} />
          <a
            className="fragment-subject"
            href={MENTION_THREAD.url}
            target="_blank"
            rel="noreferrer"
          >
            {MENTION_THREAD.title}
          </a>
          <p>{MENTION_THREAD.body}</p>
          <small>
            Saved model sentiment and summary. Read the post to make your own
            judgement.
          </small>
        </div>
      </div>
    </section>
  );
}
