import { Braces, Code2 } from "lucide-react";
import { BrandImage } from "./BrandImage";

const EXAMPLE = ['curl "$APP_URL/api/v1/projects" \\', '  -H "Authorization: Bearer $KEY"'];

export function MarketingApiPanel() {
  return (
    <section className="dark-api-panel" id="api" data-proof="api">
      <div className="api-panel-copy">
        <h2>
          Read-only by design.
          <br />
          <span>
            Ready for your tools
            <br />
            and your agents.
          </span>
        </h2>
        <a href="/agent-guide.md" className="api-learn">
          Read the agent guide
        </a>
        <div className="api-panel-notes">
          <p>
            <strong>REST API</strong>Read saved projects, leads, SEO opportunities, themes, and
            usage. Mint a read-only key in Settings.
          </p>
          <p>
            <strong>MCP server</strong>Connect an agent to the same research. It has no tool for
            posting or sending DMs.
          </p>
        </div>
      </div>
      <div className="api-art">
        <div className="code-window">
          <div className="code-header">
            <span>
              <Braces />
              REST + MCP
            </span>
            <BrandImage name="AnyAPI" src="/anyapi-mark.svg" size={22} />
          </div>
          <small>Read your projects</small>
          <pre>
            <code>{EXAMPLE.join("\n")}</code>
          </pre>
          <div className="code-divider" />
          <small>MCP endpoint</small>
          <code>/api/mcp</code>
          <div className="code-links">
            <a href="/openapi.json">
              <Braces />
              API schema
            </a>
            <a href="/agent-guide.md">
              <Code2 />
              Agent guide
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
