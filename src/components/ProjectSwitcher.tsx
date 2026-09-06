"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export type SwitcherProject = { id: string; name: string };

type ProjectSwitcherProps = {
  projects: SwitcherProject[];
  defaultId: string | null;
};

/** Picks the active project, and links to the page that creates a new one. */
export function ProjectSwitcher({ projects, defaultId }: ProjectSwitcherProps) {
  const router = useRouter();
  const params = useSearchParams();
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
      <Button
        variant="outline"
        size="lg"
        nativeButton={false}
        render={<Link href="/app/projects/new">New project</Link>}
      />
    </div>
  );
}
