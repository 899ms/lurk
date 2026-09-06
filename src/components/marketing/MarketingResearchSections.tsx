import { EyebrowLink } from "./EyebrowLink";
import { PastelTile } from "./PastelTile";

export function MarketingResearchSections() {
  return (
    <section id="insights" className="research-section" data-proof="research">
      <header className="research-heading">
        <EyebrowLink href="#api">From conversations to context</EyebrowLink>
        <h2>Keep the evidence together.</h2>
        <p>
          Pain themes, competitor mentions, and data costs.
          <br />
          Different views of the research you already fetched.
        </p>
      </header>
      <div className="three-up">
        <PastelTile
          kind="insights"
          tone="lilac"
          title="Insights"
          caption="Group pain themes and communities. Not-fit reasons stay visible; they do not rewrite your filters."
        />
        <PastelTile
          kind="competitors"
          tone="teal"
          title="Competitors"
          caption="Read mentions with sentiment. These are example products, not customer endorsements."
        />
        <PastelTile
          kind="usage"
          tone="mint"
          title="Data usage"
          caption="Inspect the API behind each cost and see fetched data separately from reused data."
        />
      </div>
    </section>
  );
}
