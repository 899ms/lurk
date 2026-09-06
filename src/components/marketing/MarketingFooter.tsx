import { Wordmark } from "@/components/Wordmark";

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div>
        <Wordmark />
        <p>MIT licensed. Built on public conversations.</p>
      </div>
      <nav aria-label="Footer">
        <a href="/openapi.json">API schema</a>
        <a href="/agent-guide.md">Agent guide</a>
        <a href="https://getanyapi.com">AnyAPI</a>
        <a href="mailto:support@getanyapi.com">Contact</a>
      </nav>
    </footer>
  );
}
