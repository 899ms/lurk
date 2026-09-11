"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Favicon } from "@/components/Favicon";

export type SwitcherProject = { id: string; name: string; url: string | null };

type ProjectSwitcherProps = {
  projects: SwitcherProject[];
  defaultId: string | null;
};

/** Picks the active project, and links to the page that creates a new one. */
export function ProjectSwitcher({ projects, defaultId }: ProjectSwitcherProps) {
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get("project") ?? defaultId;
  const active =
    projects.find((project) => project.id === activeId) ?? projects[0];

  function select(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("project", id);
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      {projects.length > 0 ? (
        <div className="flex items-center gap-2 rounded-control border bg-surface px-2">
          <Favicon url={active?.url ?? null} name={active?.name ?? "?"} />
          <select
            value={activeId ?? ""}
            onChange={(event) => select(event.target.value)}
            aria-label="Active project"
            // pr-6 keeps a long project name clear of the select's own arrow,
            // which a native select draws over the text rather than eliding it.
            className="h-10 min-w-0 flex-1 bg-surface pr-6 text-body text-fg"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
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
