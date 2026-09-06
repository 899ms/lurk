import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { ThemeToggle } from "@/components/ThemeToggle";

export function MarketingNav() {
  return (
    <header className="marketing-nav">
      <Link href="/" aria-label="Reddit Leads home">
        <Wordmark />
      </Link>
      <nav aria-label="Main navigation">
        <a href="#features">Features</a>
        <a href="#costs">Data costs</a>
        <a href="#self-host">Self-host</a>
      </nav>
      <div className="nav-actions">
        <ThemeToggle />
        <Link className="marketing-button" href="/sign-up">
          Start free
        </Link>
      </div>
    </header>
  );
}
