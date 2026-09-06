import { Sparkles } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { SubredditChip } from "@/components/SubredditChip";
import { MockButton } from "./MockButton";
import { MockFrame } from "./MockFrame";
import { DRAFT_THREAD, MOCK_DRAFT } from "./mockContent";

/** The reply drafter as it looks in the product: a saved thread, tabs, the draft, and Copy. */
export function AppMockDrafts() {
  return (
    <MockFrame active="Leads" title="Draft a reply">
      <div className="mock-content mock-drafts">
        <div className="mock-identity">
          <AuthorAvatar name={DRAFT_THREAD.author} src={DRAFT_THREAD.avatar} size={30} />
          <span>u/{DRAFT_THREAD.author}</span>
          <SubredditChip name={DRAFT_THREAD.subreddit} iconUrl={DRAFT_THREAD.subredditIcon} />
        </div>
        <a className="mock-lead-title" href={DRAFT_THREAD.url} target="_blank" rel="noreferrer">
          {DRAFT_THREAD.title}
        </a>
        <p className="mock-body">{DRAFT_THREAD.body}</p>
        <div className="mock-draft-panel">
          <div className="quiet-tabs">
            <span data-on>Comment</span>
            <span>DM</span>
            <span data-on>Starter</span>
            <span>Pitch</span>
            <span className="mock-generate">
              <Sparkles size={12} />
              Generate
            </span>
          </div>
          <small>Reacts to what they wrote and asks one open question. No product, no link.</small>
          <div className="mock-draft-text">{MOCK_DRAFT}</div>
          <div className="mock-draft-foot">
            <MockButton label="Copy" />
            <small>You post this yourself. Nothing here sends.</small>
          </div>
        </div>
      </div>
    </MockFrame>
  );
}
