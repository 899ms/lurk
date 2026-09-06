"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { generateDraftAction } from "@/app/app/leads/drafts-actions";
import { PillTabs } from "@/components/PillTabs";
import { Button } from "@/components/ui/button";
import { isDraftKind, isDraftMode, pitchAllowed, pitchRefusal } from "@/lib/drafts/policy";
import type { DraftKind, DraftMode } from "@/lib/drafts/policy";

type DraftPanelProps = {
  projectId: string;
  leadId: string;
  subreddit: string;
  promoPolicy: string | null;
};

const KIND_TABS = [
  { id: "comment", label: "Comment" },
  { id: "dm", label: "DM" },
];

const MODE_TABS = [
  { id: "starter", label: "Starter" },
  { id: "pitch", label: "Pitch" },
];

const MODE_SENTENCE: Record<DraftMode, string> = {
  starter: "Reacts to what they wrote and asks one open question. No product, no link.",
  pitch: "Compares the real options honestly and mentions your product once.",
};

/** Writes a reply for one lead, in your voice, for you to edit and post yourself. */
export function DraftPanel({ projectId, leadId, subreddit, promoPolicy }: DraftPanelProps) {
  const [kind, setKind] = useState<DraftKind>("comment");
  const [mode, setMode] = useState<DraftMode>("starter");
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const pitchBlocked = mode === "pitch" && !pitchAllowed(promoPolicy);
  const notice = pitchBlocked ? pitchRefusal(subreddit, promoPolicy) : message;

  function generate() {
    setMessage(null);
    startTransition(async () => {
      const result = await generateDraftAction(projectId, leadId, kind, mode);
      if (result.ok) {
        setText(result.text);
      } else {
        setMessage(result.message);
      }
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border bg-surface-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <PillTabs
          tabs={KIND_TABS}
          activeId={kind}
          onSelect={(id) => isDraftKind(id) && setKind(id)}
        />
        <PillTabs
          tabs={MODE_TABS}
          activeId={mode}
          onSelect={(id) => isDraftMode(id) && setMode(id)}
        />
        <Button size="lg" onClick={generate} disabled={pending || pitchBlocked}>
          <Sparkles className="size-3.5" aria-hidden="true" />
          {pending ? "Writing" : text ? "Write another" : "Generate"}
        </Button>
      </div>

      <p className="text-small text-fg-muted">{MODE_SENTENCE[mode]}</p>
      {notice ? <p className="text-small text-reddit">{notice}</p> : null}

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={6}
        aria-label="Your reply"
        placeholder="Press Generate, then edit it until it sounds like you."
        className="w-full resize-y rounded-control border bg-surface p-3 text-body text-fg"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="lg" onClick={copy} disabled={!text}>
          {copied ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        <span className="text-mono text-fg-muted">You post this yourself. Nothing here sends.</span>
      </div>
    </div>
  );
}
