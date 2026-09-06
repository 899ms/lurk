import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

const COLUMNS = [
  {
    title: "Discover",
    links: [
      ["Leads", "#features"],
      ["Reddit SEO", "#features"],
      ["Competitors", "#insights"],
    ],
  },
  {
    title: "Understand",
    links: [
      ["Scores and reasons", "#score"],
      ["Community rules", "#rules"],
      ["Insights", "#insights"],
    ],
  },
  {
    title: "Your workflow",
    links: [
      ["Copy a draft", "#drafts"],
      ["Alerts", "#alerts"],
      ["Data costs", "#costs"],
    ],
  },
  {
    title: "Build with it",
    links: [
      ["REST schema", "/openapi.json"],
      ["MCP agent guide", "/agent-guide.md"],
      ["Self-host", "#self-host"],
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="marketing-footer" data-proof="footer">
      <nav className="footer-columns" aria-label="Footer">
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <span>{column.title}</span>
            {column.links.map(([label, href]) => (
              <a key={label} href={href}>
                {label}
              </a>
            ))}
          </div>
        ))}
        <div>
          <span>Get started</span>
          <Link href="/sign-up">Hosted free</Link>
          <a href="https://getanyapi.com">AnyAPI</a>
          <a href="mailto:support@getanyapi.com">Contact</a>
        </div>
      </nav>
      <div className="footer-bottom">
        <Wordmark />
        <span>MIT licensed. Built on public conversations.</span>
      </div>
    </footer>
  );
}
