import { Avatar } from "@/components/Avatar";

type FaviconProps = { url: string | null; name: string; size?: number };

function host(url: string | null): string | null {
  if (!url) {
    return null;
  }
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return null;
  }
}

/** A site's own icon, costing nothing, falling back to its initials. */
export function Favicon({ url, name, size = 20 }: FaviconProps) {
  const domain = host(url);
  return (
    <Avatar
      name={name}
      size={size}
      src={
        domain
          ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
          : null
      }
    />
  );
}
