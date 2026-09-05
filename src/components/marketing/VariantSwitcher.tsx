import Link from "next/link";
import { cn } from "@/lib/utils";

export const VARIANTS = ["a", "b", "c"] as const;
export type Variant = (typeof VARIANTS)[number];

type VariantSwitcherProps = { active: Variant };

/** A fixed pill for cycling the three design directions during review. */
export function VariantSwitcher({ active }: VariantSwitcherProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex gap-1 rounded-control border bg-surface p-1 shadow-sm">
      {VARIANTS.map((variant) => (
        <Link
          key={variant}
          href={`/?v=${variant}`}
          aria-current={variant === active ? "page" : undefined}
          className={cn(
            "rounded-control px-2.5 py-1 text-small uppercase",
            variant === active ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          {variant}
        </Link>
      ))}
    </div>
  );
}
