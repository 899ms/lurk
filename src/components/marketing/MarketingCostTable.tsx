"use client";
import { useState } from "react";
import { limitsFor, type TierName } from "@/lib/tiers";
import { BrandImage } from "./BrandImage";
import { MOCK_USAGE_ROWS } from "./mockContent";

const OPTIONS = [
  { id: "free", label: "Hosted free" },
  { id: "connected", label: "Connected wallet" },
  { id: "self-host", label: "Self-host" },
] as const;
type Choice = (typeof OPTIONS)[number]["id"];
const count = (value: number | null | undefined) =>
  value == null ? "No app limit" : value.toLocaleString("en-US");

export function MarketingCostTable() {
  const [choice, setChoice] = useState<Choice>("free");
  const limits = limitsFor(
    choice === "self-host" ? "free" : (choice as TierName),
    choice === "self-host",
  );
  const fields = [
    ["Projects", count(limits?.projects)],
    ["Keywords / project", count(limits?.keywordsPerProject)],
    ["Communities / project", count(limits?.subredditsPerProject)],
    [
      "Scan cadence",
      limits
        ? `Every ${limits.scanIntervalHours} ${limits.scanIntervalHours === 1 ? "hour" : "hours"}`
        : "Your schedule",
    ],
    [
      "SEO refresh",
      limits
        ? `Every ${limits.seoRefreshDays} ${limits.seoRefreshDays === 1 ? "day" : "days"}`
        : "Your schedule",
    ],
    ["API reads / day", count(limits?.apiRequestsPerDay)],
  ];
  return (
    <section className="cost-table-section" id="costs" data-proof="costs">
      <header className="narrow-heading">
        <h2>
          The <span>data</span> behind a lead.
        </h2>
        <p>
          AnyAPI bills each request in dollars. These are measured per-call prices, not a
          subscription or a claim about your total spend.{" "}
          <a href="https://getanyapi.com">Explore AnyAPI</a>
        </p>
      </header>
      <div className="price-bars" role="table" aria-label="Measured AnyAPI request prices">
        {MOCK_USAGE_ROWS.map((row) => (
          <div role="row" className="price-bar-row" key={row.api}>
            <span role="cell" className="price-api">
              <BrandImage name="AnyAPI" src="/anyapi-mark.svg" size={22} />
              {row.api}
            </span>
            <span role="cell" className="price-track" aria-label={row.purpose}>
              <span
                className={row.api === "reddit.search" ? "price-bar accent" : "price-bar"}
                style={{ width: `${(Number(row.cost.slice(1)) / 0.002) * 100}%` }}
              />
            </span>
            <span role="cell" className="price-value">
              {row.cost}
            </span>
          </div>
        ))}
      </div>
      <div className="tier-selector" role="tablist" aria-label="Hosting options">
        {OPTIONS.map((option, index) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            id={`tier-${option.id}`}
            aria-selected={choice === option.id}
            aria-controls="tier-limits"
            tabIndex={choice === option.id ? 0 : -1}
            onClick={() => setChoice(option.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                const next = OPTIONS[(index + (event.key === "ArrowRight" ? 1 : 2)) % 3];
                setChoice(next.id);
                document.getElementById(`tier-${next.id}`)?.focus();
              }
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div
        className="tier-limits"
        id="tier-limits"
        role="tabpanel"
        aria-labelledby={`tier-${choice}`}
      >
        <p>
          {choice === "free"
            ? "Start on the house wallet, within the hosted free limits."
            : choice === "connected"
              ? "Your AnyAPI wallet buys freshness and breadth. Pay per call."
              : "Run the MIT source yourself. App tier limits are removed."}
        </p>
        <dl>
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <small>
          {limits
            ? `${limits.alertCadence === "daily" ? "Daily" : "Hourly"} alerts / ${count(limits.alertWebhooks)} webhook${limits.alertWebhooks === 1 ? "" : "s"} / ${limits.seoSearchVolume ? "Monthly search volume included" : "SEO volume with a connected wallet"}`
            : "Configure Docker, Postgres, Clerk, AnyAPI and OpenRouter. Model usage is billed separately."}
        </small>
      </div>
    </section>
  );
}
