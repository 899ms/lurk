import { Bell, Check, Mail, ShieldCheck, SlidersHorizontal, Webhook } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { SubredditChip } from "@/components/SubredditChip";
import { BrandImage } from "./BrandImage";
import { MockLeadCard } from "./MockLeadCard";
import { DraftPreview } from "./DraftPreview";
import { MOCK_DETAIL } from "./mockContent";

export function MarketingIntentSections() {
  return (
    <>
      <section className="feature-section" id="features">
        <div className="section-intro">
          <span className="eyebrow">Buyer intent, with the evidence</span>
          <h2>
            Less keyword noise.
            <br />
            More actual questions.
          </h2>
          <p>
            Start with your product URL. Edit the profile, keywords, and communities. Scheduled
            scans read posts and comments, then score the fit.
          </p>
        </div>
        <div className="intent-grid">
          <div className="detail-stage">
            <span className="stage-label">
              <BrandImage name="Reddit" src="/brands/reddit.svg" size={18} /> A saved lead for Tally{" "}
              <BrandImage name="Tally" domain="tally.so" size={18} />
            </span>
            <MockLeadCard lead={MOCK_DETAIL} />
          </div>
          <div className="feature-notes">
            <div>
              <span className="feature-symbol">0-100</span>
              <h3>A score you can inspect</h3>
              <p>
                The reason is written out. The phrase that matched is highlighted. You can see why
                the post made the feed.
              </p>
            </div>
            <div>
              <ShieldCheck />
              <h3>The rule before the reply</h3>
              <p>
                The subreddit&apos;s own self-promotion policy sits on the lead. Read it before you
                decide how to contribute.
              </p>
              <SubredditChip name={MOCK_DETAIL.subreddit} iconUrl={MOCK_DETAIL.subredditIcon} />
            </div>
            <div>
              <SlidersHorizontal />
              <h3>Your product, your filters</h3>
              <p>
                Filter by community, time window, and intent stage. Keep seller-side mentions
                separate from people asking for help.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="feature-section feature-split" id="drafts">
        <div className="section-copy">
          <span className="eyebrow">A draft, not an autopilot</span>
          <h2>
            You have the context.
            <br />
            You make the reply.
          </h2>
          <p>
            Draft a comment or DM in your voice. Choose a conversation starter or an honest pitch,
            edit it, and copy it.
          </p>
          <p>No sending. No managed accounts. The conversation stays on Reddit.</p>
          <span className="inline-note">
            <Check />
            Your Reddit account stays yours.
          </span>
        </div>
        <div className="soft-stage">
          <DraftPreview />
        </div>
      </section>
      <section className="feature-section" id="alerts">
        <div className="section-intro">
          <span className="eyebrow">Keep up without keeping a tab open</span>
          <h2>
            The next useful thread,
            <br />
            where you already work.
          </h2>
          <p>
            New-lead alerts bring the score, reason, community, and original link to your email
            digest, Slack, Discord, or webhook.
          </p>
        </div>
        <div className="alerts-stage">
          <div className="integration-list">
            <span>
              <Mail />
              Email digest
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
          <div className="alert-preview">
            <div className="alert-heading">
              <Bell />
              <strong>A thread worth reading</strong>
              <small>Digest preview</small>
            </div>
            <div className="draft-context">
              <AuthorAvatar name={MOCK_DETAIL.author} src={MOCK_DETAIL.avatar} size={34} />
              <div>
                {MOCK_DETAIL.title}
                <small>{MOCK_DETAIL.reason}</small>
              </div>
            </div>
            <a href={MOCK_DETAIL.url} target="_blank" rel="noreferrer">
              Read the original thread
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
