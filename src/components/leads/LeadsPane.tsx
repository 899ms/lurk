"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PillTabs, type PillTab } from "@/components/PillTabs";

const TABS: PillTab[] = [
  { id: "new", label: "New" },
  { id: "hidden", label: "Hidden" },
  { id: "not_fit", label: "Not a fit" },
];

type LeadsPaneProps = { status: string; children: React.ReactNode };

/** The left pane: the status tabs, and the rows the page rendered for them. */
export function LeadsPane({ status, children }: LeadsPaneProps) {
  const router = useRouter();
  const params = useSearchParams();

  function select(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("status", id);
    next.delete("lead");
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="flex min-w-0 flex-col border-r">
      <div className="border-b p-3">
        <PillTabs tabs={TABS} activeId={status} onSelect={select} />
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
