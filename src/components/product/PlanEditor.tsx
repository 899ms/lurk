"use client";

import { Pin, PinOff, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { Favicon } from "@/components/Favicon";
import { Button } from "@/components/ui/button";
import {
  addChipAction,
  removeChipAction,
  setChipStateAction,
  type ChipKind,
} from "@/app/app/product/actions";

/** One row of the retrieval plan, with where it came from and what backs it. */
export type PlanRow = {
  value: string;
  source: string;
  state: string;
  evidence: number;
};

type PlanEditorProps = {
  title: string;
  hint: string;
  placeholder: string;
  kind: ChipKind;
  projectId: string;
  rows: PlanRow[];
  limit: number | null;
  /** Community icons, keyed by the lowercased subreddit name. */
  icons?: Record<string, string | null>;
};

const SOURCE_LABEL: Record<string, string> = {
  serp: "Google",
  llm: "Model",
  user: "You",
};

const STATE_LABEL: Record<string, string> = {
  active: "Reading",
  pinned: "Pinned",
  excluded: "Excluded",
  candidate: "Waiting",
};

/** A subreddit shows its own icon; a competitor shows its site's favicon. */
function RowMark({
  kind,
  value,
  icons,
}: {
  kind: ChipKind;
  value: string;
  icons?: Record<string, string | null>;
}) {
  if (kind === "subreddit") {
    return <Avatar name={value} src={icons?.[value.toLowerCase()] ?? null} size={16} />;
  }
  if (kind === "competitor") {
    return (
      <Favicon
        url={`${value.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`}
        name={value}
        size={16}
      />
    );
  }
  return null;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-control bg-surface-2 px-2 py-0.5 text-small text-fg-muted">
      {children}
    </span>
  );
}

/**
 * The plan as a person can argue with it: what we are reading, who put it
 * there, how much evidence stands behind it, and the two buttons that make a
 * row theirs - pin it so a rebuild cannot take it away, or exclude it so
 * discovery stops offering it.
 */
export function PlanEditor({
  title,
  hint,
  placeholder,
  kind,
  projectId,
  rows,
  limit,
  icons,
}: PlanEditorProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reading = rows.filter((row) => row.state !== "excluded" && row.state !== "candidate");
  const count = limit == null ? String(reading.length) : `${reading.length} of ${limit}`;

  function run(work: () => Promise<{ error: string | null } | void>) {
    startTransition(async () => {
      const result = await work();
      setError(result?.error ?? null);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-card border bg-surface p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-h3" style={{ fontWeight: 500 }}>
          {title}
        </h2>
        <span className="text-small text-fg-muted tabular-nums">{count}</span>
      </div>
      <p className="text-small text-fg-muted">{hint}</p>
      <ul className="flex flex-col gap-2">
        {rows.length === 0 ? (
          <li className="text-body text-fg-muted">Nothing here yet.</li>
        ) : (
          rows.map((row) => (
            <li
              key={row.value}
              className="flex flex-wrap items-center gap-2 rounded-control border bg-surface-2 px-3 py-2"
            >
              <RowMark kind={kind} value={row.value} icons={icons} />
              <span
                className={`text-body ${row.state === "excluded" ? "text-fg-muted line-through" : "text-fg"}`}
              >
                {row.value}
              </span>
              <span className="ml-auto flex items-center gap-2">
                <Badge>{SOURCE_LABEL[row.source] ?? row.source}</Badge>
                <Badge>
                  {row.evidence} {row.evidence === 1 ? "thread" : "threads"}
                </Badge>
                <Badge>{STATE_LABEL[row.state] ?? row.state}</Badge>
                <button
                  type="button"
                  aria-label={row.state === "pinned" ? `Unpin ${row.value}` : `Pin ${row.value}`}
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      setChipStateAction(
                        kind,
                        projectId,
                        row.value,
                        row.state === "pinned" ? "active" : "pinned",
                      ),
                    )
                  }
                  className="transition-motion text-fg-muted transition-colors hover:text-fg"
                >
                  {row.state === "pinned" ? (
                    <PinOff className="size-4" />
                  ) : (
                    <Pin className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      setChipStateAction(
                        kind,
                        projectId,
                        row.value,
                        row.state === "excluded" ? "active" : "excluded",
                      ),
                    )
                  }
                  className="transition-motion text-small text-fg-muted transition-colors hover:text-fg"
                >
                  {row.state === "excluded" ? "Put back" : "Exclude"}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${row.value}`}
                  disabled={pending}
                  onClick={() => run(() => removeChipAction(kind, projectId, row.value))}
                  className="transition-motion text-fg-muted transition-colors hover:text-fg"
                >
                  <X className="size-3" />
                </button>
              </span>
            </li>
          ))
        )}
      </ul>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            const result = await addChipAction(kind, projectId, draft);
            if (!result.error) {
              setDraft("");
            }
            return result;
          });
        }}
        className="flex gap-2"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          aria-label={`Add to ${title}`}
          className="h-10 flex-1 rounded-control border bg-surface px-2 text-body text-fg"
        />
        <Button type="submit" variant="outline" size="lg" disabled={pending}>
          Add
        </Button>
      </form>
      {error ? (
        <p aria-live="polite" className="text-small text-fg-muted">
          {error}
        </p>
      ) : null}
    </section>
  );
}
