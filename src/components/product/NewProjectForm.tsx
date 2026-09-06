"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  createProjectAndProfileAction,
  type NewProjectState,
} from "@/app/app/projects/new/actions";

const INITIAL: NewProjectState = { error: null };

/**
 * Name and product URL, then one submit that creates the project and builds
 * its profile. A Server Action answers once, so the wait is shown as a single
 * honest state rather than three labels advancing on a guess.
 */
export function NewProjectForm() {
  const [state, formAction, pending] = useActionState(
    createProjectAndProfileAction,
    INITIAL,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-card border bg-surface p-6"
    >
      <label className="flex flex-col gap-1 text-small text-fg-muted">
        Project name
        <input
          name="name"
          required
          disabled={pending}
          placeholder="Acme"
          className="h-10 rounded-control border bg-surface px-2 text-body text-fg"
        />
      </label>
      <label className="flex flex-col gap-1 text-small text-fg-muted">
        Product URL
        <input
          name="url"
          type="url"
          required
          disabled={pending}
          placeholder="https://yourproduct.com"
          className="h-10 rounded-control border bg-surface px-2 text-body text-fg"
        />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Building your profile" : "Create project"}
        </Button>
        {pending ? (
          <span aria-live="polite" className="text-small text-fg-muted">
            Reading your site, working out who buys it, and checking the
            subreddits. This takes a minute.
          </span>
        ) : null}
      </div>
      {state.error ? (
        <p aria-live="polite" className="text-body text-fg-muted">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
