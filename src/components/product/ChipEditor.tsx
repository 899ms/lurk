"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  addChipAction,
  removeChipAction,
  type ChipKind,
} from "@/app/app/product/actions";

type ChipEditorProps = {
  title: string;
  hint: string;
  placeholder: string;
  kind: ChipKind;
  projectId: string;
  values: string[];
  limit: number | null;
};

/** A removable list of short strings with one input to add another. */
export function ChipEditor({
  title,
  hint,
  placeholder,
  kind,
  projectId,
  values,
  limit,
}: ChipEditorProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const count =
    limit == null ? String(values.length) : `${values.length} of ${limit}`;

  function add() {
    startTransition(async () => {
      const result = await addChipAction(kind, projectId, draft);
      setError(result.error);
      if (!result.error) {
        setDraft("");
      }
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
      <div className="flex flex-wrap gap-2">
        {values.length === 0 ? (
          <span className="text-body text-fg-muted">Nothing here yet.</span>
        ) : (
          values.map((value) => (
            <span
              key={value}
              className="flex items-center gap-2 rounded-control border bg-surface-2 px-3 py-1 text-small"
            >
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    await removeChipAction(kind, projectId, value);
                  })
                }
                className="transition-motion text-fg-muted transition-colors hover:text-fg"
              >
                <X className="size-3" />
              </button>
            </span>
          ))
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          add();
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
