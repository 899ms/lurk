import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

/** Marketing header: the wordmark, the theme, and one way in. */
export function MarketingNav() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Wordmark />
      <div className="flex items-center gap-2">
        <Link href="#self-host" className="text-small text-fg-muted hover:text-fg">
          Self-host
        </Link>
        <ThemeToggle />
        <Button
          nativeButton={false}
          className="h-10 rounded-control px-4"
          render={<Link href="/sign-up">Start free</Link>}
        />
      </div>
    </header>
  );
}
