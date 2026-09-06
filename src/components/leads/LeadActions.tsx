"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, EyeOff, PenLine, ThumbsDown } from "lucide-react";
import { hideLeadAction, markNotFitAction } from "@/app/app/leads/actions";
import { Button } from "@/components/ui/button";

const NOT_FIT_REASONS = [
  "wrong audience",
  "seller side",
  "no active need",
  "wrong category",
  "other",
];

type LeadActionsProps = {
  projectId: string;
  leadId: string;
  url: string;
  title: string;
  onDraft: () => void;
};

/** The column beside a card: open it, write a reply, or take it out of the feed. */
export function LeadActions({ projectId, leadId, url, title, onDraft }: LeadActionsProps) {
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState(false);
  const iconClass = "size-3.5 text-fg-muted";

  async function copyTitle() {
    await navigator.clipboard.writeText(title);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex w-40 shrink-0 flex-col gap-1.5">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        className="justify-start"
        render={
          <a href={url} target="_blank" rel="noreferrer noopener">
            <ExternalLink className={iconClass} aria-hidden="true" />
            Open on Reddit
          </a>
        }
      />
      <Button variant="ghost" size="sm" className="justify-start" onClick={onDraft}>
        <PenLine className={iconClass} aria-hidden="true" />
        Draft a reply
      </Button>
      <Button variant="ghost" size="sm" className="justify-start" onClick={copyTitle}>
        {copied ? (
          <Check className={iconClass} aria-hidden="true" />
        ) : (
          <Copy className={iconClass} aria-hidden="true" />
        )}
        {copied ? "Copied" : "Copy title"}
      </Button>
      <form action={hideLeadAction.bind(null, projectId, leadId)}>
        <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
          <EyeOff className={iconClass} aria-hidden="true" />
          Hide
        </Button>
      </form>
      {picking ? (
        <form
          action={markNotFitAction.bind(null, projectId, leadId)}
          className="flex flex-col gap-1.5"
        >
          <select
            name="reason"
            required
            defaultValue=""
            aria-label="Why this lead is not a fit"
            className="h-7 rounded-control border bg-surface px-1.5 text-small text-fg"
          >
            <option value="" disabled>
              Pick a reason
            </option>
            {NOT_FIT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm" className="justify-start">
            Save
          </Button>
        </form>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => setPicking(true)}
        >
          <ThumbsDown className={iconClass} aria-hidden="true" />
          Not a fit
        </Button>
      )}
    </div>
  );
}
