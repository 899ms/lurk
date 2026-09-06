import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function CtaRow({ className }: { className?: string }) {
  return (
    <div className={cn("cta-row", className)}>
      <Link className="marketing-button" href="/sign-up">
        Find leads for free
        <ArrowUpRight />
      </Link>
      <a className="marketing-button secondary" href="#self-host">
        Self-host
      </a>
    </div>
  );
}
