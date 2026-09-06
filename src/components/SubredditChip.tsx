import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";

type SubredditChipProps = { name: string; iconUrl?: string | null; className?: string };

/** "r/SaaS" with the community's own icon, or the "r/" disc Reddit shows when it has none. */
export function SubredditChip({ name, iconUrl, className }: SubredditChipProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-mono text-fg-muted", className)}>
      <Avatar name={name} src={iconUrl || "/brands/subreddit-default.svg"} size={16} />
      r/{name}
    </span>
  );
}
