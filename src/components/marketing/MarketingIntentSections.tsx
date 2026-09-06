import { ShieldCheck } from "lucide-react";
import { RULE_THREAD } from "./mockContent";
import { ThreadIdentity } from "./ThreadIdentity";
import { DraftPreview } from "./DraftPreview";

export function MarketingIntentSections() {
  return (
    <section className="reply-story" id="drafts" data-proof="reply">
      <header className="narrow-heading">
        <h2>
          <span>Context first.</span> Your reply, your decision.
        </h2>
        <p>
          Check the community&apos;s own rules before drafting. Write a comment
          or DM in your voice, edit it, and copy it. lurk never posts or sends a
          DM.
        </p>
      </header>
      <div className="reply-grid">
        <div className="reply-rule" id="rules">
          <ThreadIdentity thread={RULE_THREAD} />
          <a
            className="fragment-subject"
            href={RULE_THREAD.url}
            target="_blank"
            rel="noreferrer"
          >
            {RULE_THREAD.title}
          </a>
          <p>
            {
              "I'm looking for a Tally alternative that's still straightforward to build with but puts more emphasis on actually analyzing survey responses."
            }
          </p>
          <div className="policy-evidence">
            <ShieldCheck />
            <div>
              <strong>r/nocode: contribute value</strong>
              <p>
                Blatant self-promotion is not allowed without giving substantial
                value back to the community.
              </p>
              <a
                href="https://www.reddit.com/r/nocode/about/rules/"
                target="_blank"
                rel="noreferrer"
              >
                Read the current rules
              </a>
            </div>
          </div>
          <small>
            Saved thread, not scored. Policy paraphrased from the community
            sidebar.
          </small>
        </div>
        <DraftPreview />
      </div>
    </section>
  );
}
