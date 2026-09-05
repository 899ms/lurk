"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createProjectAction } from "@/app/app/actions";

export type SwitcherProject = { id: string; name: string };

type ProjectSwitcherProps = { projects: SwitcherProject[]; defaultId: string | null };

/** Picks the active project and creates a new one with a name and a URL. */
export function ProjectSwitcher({ projects, defaultId }: ProjectSwitcherProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [creating, setCreating] = useState(projects.length === 0);
  const activeId = params.get("project") ?? defaultId;

  function select(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("project", id);
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      {projects.length > 0 ? (
        <select
          value={activeId ?? ""}
          onChange={(event) => select(event.target.value)}
          aria-label="Active project"
          className="h-10 rounded-control border bg-surface px-2 text-body text-fg"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      ) : null}
      {creating ? (
        <form action={createProjectAction} className="flex flex-col gap-2">
          <input
            name="name"
            required
            placeholder="Project name"
            className="h-10 rounded-control border bg-surface px-2 text-body"
          />
          <input
            name="url"
            type="url"
            placeholder="https://yourproduct.com"
            className="h-10 rounded-control border bg-surface px-2 text-body"
          />
          <Button type="submit" size="lg">
            Create project
          </Button>
        </form>
      ) : (
        <Button variant="outline" size="lg" onClick={() => setCreating(true)}>
          New project
        </Button>
      )}
    </div>
  );
}
