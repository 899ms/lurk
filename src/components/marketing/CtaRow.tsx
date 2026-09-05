import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaRowProps = { className?: string };

const SHAPE = "h-10 rounded-control px-4";

/** The two calls to action, in the one order every variant uses. */
export function CtaRow({ className }: CtaRowProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Button
        nativeButton={false}
        className={SHAPE}
        render={<Link href="/sign-up">Start free</Link>}
      />
      <Button
        variant="outline"
        nativeButton={false}
        className={SHAPE}
        render={<Link href="#self-host">Self-host</Link>}
      />
    </div>
  );
}
