import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string | null;
  src?: string | null;
  size?: number;
  className?: string;
};

function initials(name: string | null): string {
  const cleaned = (name ?? "").replace(/[^a-z0-9]/gi, "");
  return cleaned ? cleaned.slice(0, 2).toUpperCase() : "?";
}

/** A round face, or the first two letters of a name when there is no picture. */
export function Avatar({ name, src, size = 28, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-surface-2 text-fg-muted",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {src ? (
        // Reddit serves avatars from several CDN hosts we do not control.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size} height={size} className="size-full object-cover" />
      ) : (
        <span style={{ fontWeight: 500 }}>{initials(name)}</span>
      )}
    </span>
  );
}
