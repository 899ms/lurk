import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

type SettingsLinkCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  sentence: string;
};

/** One card on the settings page that leads to a settings screen of its own. */
export function SettingsLinkCard({ href, icon: Icon, title, sentence }: SettingsLinkCardProps) {
  return (
    <Link
      href={href}
      className="transition-motion flex items-center gap-4 rounded-card border bg-surface p-6 transition-colors hover:bg-surface-2"
    >
      <Icon className="size-5 shrink-0 text-fg-muted" aria-hidden="true" />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-h3 text-fg" style={{ fontWeight: 500 }}>
          {title}
        </span>
        <span className="text-body text-fg-muted">{sentence}</span>
      </span>
      <ChevronRight className="ml-auto size-4 shrink-0 text-fg-muted" aria-hidden="true" />
    </Link>
  );
}
