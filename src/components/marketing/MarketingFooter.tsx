import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

/** Licence, the repository, AnyAPI, and a human to email. */
export function MarketingFooter() {
  return (
    <footer className="flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <Wordmark />
        <span className="text-small text-fg-muted">Open source under MIT</span>
      </div>
      <nav className="flex flex-wrap items-center gap-5 text-small text-fg-muted">
        <Link href="#" className="hover:text-fg">
          GitHub
        </Link>
        <a href="https://getanyapi.com" className="hover:text-fg">
          getanyapi.com
        </a>
        <a href="mailto:support@getanyapi.com" className="hover:text-fg">
          support@getanyapi.com
        </a>
      </nav>
    </footer>
  );
}
