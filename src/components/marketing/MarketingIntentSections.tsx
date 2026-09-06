import { Bell, Mail, Webhook } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { BrandImage } from "./BrandImage";
import { MockLeadCard } from "./MockLeadCard";
import { MarketingFragment } from "./MarketingFragment";
import { DraftPreview } from "./DraftPreview";
import { MOCK_DETAIL } from "./mockContent";

export function MarketingIntentSections() {
  return (
    <>
      <section className="floating-feature" id="score" data-proof="score">
        <header className="narrow-heading">
          <h2>
            <span>Scoring</span> you can read, not just trust.
          </h2>
          <p>
            A score from 0 to 100, the reason written out, and the phrase that matched. Inspect the
            fit before you spend time on a reply.{" "}
            <a href={MOCK_DETAIL.url} target="_blank" rel="noreferrer">
              Read the example
            </a>
          </p>
        </header>
        <div className="floating-stage score-stage">
          <div className="fragment-prompt">
            What makes this a useful lead?
            <small>
              Saved example for Tally <BrandImage name="Tally" domain="tally.so" size={16} />
            </small>
          </div>
          <div className="floating-main">
            <MockLeadCard lead={MOCK_DETAIL} />
          </div>
        </div>
      </section>
      <section className="floating-feature" id="rules" data-proof="rules">
        <header className="narrow-heading">
          <h2>
            <span>Community rules</span> before your first word.
          </h2>
          <p>
            The subreddit&apos;s own self-promotion policy belongs next to the lead. A good match is
            a reason to read, not permission to promote.{" "}
            <a href="https://www.reddit.com/r/nocode/about/rules/" target="_blank" rel="noreferrer">
              Read the rules
            </a>
          </p>
        </header>
        <div className="floating-stage rule-stage">
          <div className="floating-back">
            <MarketingFragment kind="leads" />
          </div>
          <div className="floating-main">
            <MarketingFragment kind="rule" />
          </div>
        </div>
      </section>
      <section className="floating-feature" id="drafts" data-proof="drafts">
        <header className="narrow-heading">
          <h2>
            <span>Drafts</span> you copy. Replies you choose.
          </h2>
          <p>
            Write a comment or DM in your voice, as a conversation starter or an honest pitch. Edit
            it, copy it, and decide whether to reply on Reddit.{" "}
            <a href={MOCK_DETAIL.url} target="_blank" rel="noreferrer">
              Open the thread
            </a>
          </p>
        </header>
        <div className="floating-stage draft-stage">
          <div className="fragment-prompt">
            <AuthorAvatar name={MOCK_DETAIL.author} src={MOCK_DETAIL.avatar} size={32} />
            <span>
              {MOCK_DETAIL.title}
              <small>u/{MOCK_DETAIL.author}</small>
            </span>
          </div>
          <div className="floating-main">
            <DraftPreview />
          </div>
        </div>
      </section>
      <section className="floating-feature" id="alerts" data-proof="alerts">
        <header className="narrow-heading">
          <h2>
            <span>Alerts</span> where you already work.
          </h2>
          <p>
            A new-lead digest brings the score, reason, community, and original link to email,
            Slack, Discord, or your webhook. <a href="#costs">Compare alert cadence</a>
          </p>
        </header>
        <div className="floating-stage alert-stage">
          <div className="alert-channels">
            <span>
              <Mail />
              Email
            </span>
            <span>
              <BrandImage name="Slack" src="/brands/slack.svg" size={26} />
              Slack
            </span>
            <span>
              <BrandImage name="Discord" src="/brands/discord.svg" size={26} />
              Discord
            </span>
            <span>
              <Webhook />
              Webhook
            </span>
          </div>
          <div className="floating-main alert-card">
            <div className="fragment-title">
              <Bell />A thread worth reading<small>Digest preview</small>
            </div>
            <MarketingFragment kind="leads" />
          </div>
        </div>
      </section>
    </>
  );
}
