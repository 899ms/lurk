"use client";
import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { DRAFT_THREAD, MOCK_DRAFT } from "./mockContent";

export function DraftPreview() {
  const [status, setStatus] = useState("Copy draft");
  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(MOCK_DRAFT);
      setStatus("Copied");
    } catch {
      setStatus("Select text to copy");
    }
  }
  return (
    <div className="draft-preview">
      <div className="draft-context">
        <AuthorAvatar
          name={DRAFT_THREAD.author}
          src={DRAFT_THREAD.avatar}
          size={36}
        />
        <div>
          Reply to u/{DRAFT_THREAD.author}
          <small>Comment draft / conversation starter</small>
        </div>
      </div>
      <a
        className="draft-thread-title"
        href={DRAFT_THREAD.url}
        target="_blank"
        rel="noreferrer"
      >
        {DRAFT_THREAD.title}
      </a>
      <p>{MOCK_DRAFT}</p>
      <div className="draft-actions">
        <button type="button" className="marketing-button" onClick={copyDraft}>
          {status === "Copied" ? <Check /> : <Copy />}
          {status}
        </button>
        <a href={DRAFT_THREAD.url} target="_blank" rel="noreferrer">
          Open thread
          <ExternalLink />
        </a>
      </div>
      <small>
        Illustrative draft for this unscored saved thread. Nothing is sent.
      </small>
    </div>
  );
}
