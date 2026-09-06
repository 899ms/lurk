"use client";
import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { AuthorAvatar } from "@/components/AuthorAvatar";
import { MOCK_DETAIL, MOCK_DRAFT } from "./mockContent";

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
        <AuthorAvatar name={MOCK_DETAIL.author} src={MOCK_DETAIL.avatar} size={36} />
        <div>
          Reply to u/{MOCK_DETAIL.author}
          <small>Comment draft / conversation starter</small>
        </div>
      </div>
      <p>{MOCK_DRAFT}</p>
      <div className="draft-actions">
        <button type="button" className="marketing-button" onClick={copyDraft}>
          {status === "Copied" ? <Check /> : <Copy />}
          {status}
        </button>
        <a href={MOCK_DETAIL.url} target="_blank" rel="noreferrer">
          Open thread
          <ExternalLink />
        </a>
      </div>
      <small>Example draft. Nothing is sent from this page.</small>
    </div>
  );
}
