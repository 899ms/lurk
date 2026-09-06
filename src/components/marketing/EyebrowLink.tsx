import { ChevronRight } from "lucide-react";

export function EyebrowLink({
  href,
  children,
  pill = false,
}: {
  href: string;
  children: React.ReactNode;
  pill?: boolean;
}) {
  return (
    <a className={`eyebrow-link${pill ? " eyebrow-pill" : ""}`} href={href}>
      {children}
      <ChevronRight aria-hidden="true" />
    </a>
  );
}
