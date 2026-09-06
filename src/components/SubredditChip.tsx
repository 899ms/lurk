import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";

type SubredditChipProps = { name: string; iconUrl?: string | null; className?: string };

/** "r/SaaS" with the community's own icon, or the one dot of Reddit colour. */
export function SubredditChip({ name, iconUrl, className }: SubredditChipProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-mono text-fg-muted", className)}>
      {iconUrl ? (
        <Avatar name={name} src={iconUrl} size={16} />
      ) : (
        <span className="size-1.5 shrink-0 rounded-full bg-reddit" aria-hidden="true" />
      )}
      r/{name}
    </span>
  );
}
