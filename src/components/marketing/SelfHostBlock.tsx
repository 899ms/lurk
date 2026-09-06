import Link from "next/link";
import { Check, Terminal } from "lucide-react";
import { TIERS } from "@/lib/tiers";
import { BrandImage } from "./BrandImage";

export function SelfHostBlock() {
  const free = TIERS.free;
  return (
    <section className="feature-section" id="self-host">
      <div className="section-intro">
        <span className="eyebrow">Open source, with a free place to start</span>
        <h2>
          Same features.
          <br />
          Your choice of wallet.
        </h2>
        <p>
          Start on our house wallet. Connect yours for freshness and breadth, or self-host the MIT
          source with Docker Compose.
        </p>
      </div>
      <div className="plans-grid">
        <article className="plan-card">
          <span className="plan-icon">
            <BrandImage name="AnyAPI" src="/anyapi-mark.svg" size={26} />
          </span>
          <h3>Hosted free</h3>
          <p>On the house wallet.</p>
          <ul>
            <li>
              <Check />
              {free.projects} projects, {free.keywordsPerProject} keywords each
            </li>
            <li>
              <Check />
              {free.subredditsPerProject} communities per project
            </li>
            <li>
              <Check />
              Scan every {free.scanIntervalHours} hours
            </li>
            <li>
              <Check />
              Daily digest + {free.alertWebhooks} webhook
            </li>
            <li>
              <Check />
              {free.apiRequestsPerDay.toLocaleString("en-US")} API requests a day
            </li>
          </ul>
          <Link className="marketing-button" href="/sign-up">
            Start free
          </Link>
        </article>
        <article className="plan-card">
          <span className="plan-icon">
            <BrandImage name="AnyAPI" src="/anyapi-mark.svg" size={26} />
          </span>
          <h3>Connect your wallet</h3>
          <p>Pay AnyAPI per call. No subscription.</p>
          <ul>
            <li>
              <Check />
              Hourly scans
            </li>
            <li>
              <Check />
              Unlimited projects and keywords
            </li>
            <li>
              <Check />
              Comments over your threshold
            </li>
            <li>
              <Check />
              Daily SEO + monthly volume
            </li>
            <li>
              <Check />
              Unlimited webhooks
            </li>
          </ul>
          <Link className="text-link" href="/sign-up">
            Start with the free tier
          </Link>
        </article>
        <article className="plan-card">
          <span className="plan-icon">
            <Terminal />
          </span>
          <h3>Run it yourself</h3>
          <p>MIT source. No app tier limits.</p>
          <div className="compose-command">
            <code>docker compose up</code>
          </div>
          <p className="setup-note">
            From a source checkout, configure Docker, Postgres, Clerk, an AnyAPI key, and an
            OpenRouter key in .env. Model usage is billed separately by OpenRouter.
          </p>
          <span className="inline-note">
            <Check />
            Your infrastructure. Your keys.
          </span>
        </article>
      </div>
    </section>
  );
}
