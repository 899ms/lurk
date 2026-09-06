import { Braces, Code2 } from "lucide-react";
import { MarketingIntentSections } from "./MarketingIntentSections";
import { MarketingResearchSections } from "./MarketingResearchSections";

export function MarketingFeatures() {
  return (
    <>
      <MarketingIntentSections />
      <MarketingResearchSections />
      <section className="feature-section api-section" id="api">
        <div className="section-copy">
          <span className="eyebrow">For your tools and your agents</span>
          <h2>
            Your leads.
            <br />
            More ways to read them.
          </h2>
          <p>
            The read-only REST API and MCP server expose the same research. Let an agent triage the
            evidence, without giving it a way to post.
          </p>
          <div className="api-links">
            <a href="/openapi.json">
              <Braces />
              REST schema
            </a>
            <a href="/agent-guide.md">
              <Code2 />
              Agent guide + MCP
            </a>
          </div>
        </div>
        <div className="api-preview">
          <div>
            <span className="status-dot" />
            Read-only
          </div>
          <code>GET /api/v1/projects</code>
          <code>{"GET /api/v1/projects/{id}/leads"}</code>
          <div className="api-rule" />
          <span>MCP endpoint</span>
          <code>/api/mcp</code>
          <small>Connect with a read-only key from Settings.</small>
        </div>
      </section>
    </>
  );
}
