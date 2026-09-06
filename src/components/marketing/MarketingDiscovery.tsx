import { EyebrowLink } from "./EyebrowLink";
import { PastelTile } from "./PastelTile";

export function MarketingDiscovery() {
  return (
    <section id="features" className="discovery-section" data-proof="discovery">
      <header className="centered-heading">
        <EyebrowLink href="#score" pill>
          Start with the ask
        </EyebrowLink>
        <h2>
          When someone asks on Reddit,
          <br />
          start with the conversation.
        </h2>
        <p>
          Describe your product. Choose your keywords and communities.
          <br />
          Find people asking, threads ranking, and alternatives being discussed.
        </p>
      </header>
      <div className="three-up">
        <PastelTile
          kind="leads"
          tone="pink"
          title="Leads"
          caption="Find posts and comments asking for what you sell, scored with a written reason."
        />
        <PastelTile
          kind="seo"
          tone="teal"
          title="Reddit SEO"
          caption="See saved Google positions and whether a competitor is named in the thread."
        />
        <PastelTile
          kind="competitors"
          tone="mint"
          title="Competitors"
          caption="Track product mentions and read the sentiment behind each one."
        />
      </div>
    </section>
  );
}
