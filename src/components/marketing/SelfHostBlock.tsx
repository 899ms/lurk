import { Code2, Copy, LockKeyhole, Terminal } from "lucide-react";
import { BrandImage } from "./BrandImage";
import { EyebrowLink } from "./EyebrowLink";

export function SelfHostBlock() {
  return (
    <section id="self-host" className="control-section" data-proof="control">
      <header className="centered-heading">
        <EyebrowLink href="#costs" pill>
          Open source. Your choice of wallet.
        </EyebrowLink>
        <h2>
          Useful tools.
          <br />
          Clear boundaries.
        </h2>
        <p>
          Start on the hosted free tier or run the source yourself.
          <br />
          The decision to reply always stays with you.
        </p>
      </header>
      <div className="four-up">
        <figure>
          <div className="control-art">
            <Code2 className="control-main-icon" />
            <span className="control-stamp">MIT</span>
            <span className="control-subtext">Read it. Change it. Run it.</span>
          </div>
          <figcaption>
            <strong>Open source</strong> MIT licensed. The code is yours to inspect and adapt.
          </figcaption>
        </figure>
        <figure>
          <div className="control-art terminal-art">
            <Terminal className="control-main-icon" />
            <code>docker compose up</code>
          </div>
          <figcaption>
            <strong>Self-host</strong> Use a source checkout with Docker, Postgres, Clerk, AnyAPI
            and OpenRouter configured.
          </figcaption>
        </figure>
        <figure>
          <div className="control-art wallet-art">
            <BrandImage name="AnyAPI" src="/anyapi-mark.svg" size={68} />
            <span className="control-stamp">
              <LockKeyhole />
              Your wallet
            </span>
            <span className="control-subtext">Pay per call</span>
          </div>
          <figcaption>
            <strong>Connect a wallet</strong> Buy freshness and breadth from AnyAPI. Model usage is
            separate.
          </figcaption>
        </figure>
        <figure>
          <div className="control-art copy-art">
            <BrandImage name="Reddit" src="/brands/reddit.svg" size={56} />
            <span className="control-stamp">
              <Copy />
              Copy draft
            </span>
            <span className="control-subtext">The next step is yours.</span>
          </div>
          <figcaption>
            <strong>Never posts or DMs</strong> Drafts have a Copy button. There is no sending,
            inbox, or managed account.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
