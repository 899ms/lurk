import { Code2, FileCode2, Folder, Terminal } from "lucide-react";
import { REPO_TREE, REPO_URL } from "./researchContent";
import { EyebrowLink } from "./EyebrowLink";

/** Expected output copied from entrypoint/migrator source, not a claimed run. */
export function OpenSourceBlock() {
  return (
    <section id="self-host" className="open-source-block" data-proof="source">
      <header className="narrow-heading">
        <EyebrowLink href={REPO_URL}>Open source / MIT</EyebrowLink>
        <h2>
          Read the code.
          <br />
          <span>Run it on your own key.</span>
        </h2>
        <p>
          The scoring instructions are a file, not a secret. Read{" "}
          <a href={`${REPO_URL}/blob/main/src/lib/prompts.ts`}>
            src/lib/prompts.ts
          </a>
          , change what matters to you, and run lurk yourself.
        </p>
      </header>
      <div className="source-grid">
        <div className="source-browser">
          <div className="fragment-title">
            <Code2 />
            getanyapi-com / lurk<span className="source-license">MIT</span>
          </div>
          <div className="source-files">
            {[
              "src/app/",
              "src/components/",
              "src/db/",
              "src/jobs/",
              "src/lib/",
              "src/styles/",
            ].map((path) => (
              <a href={`${REPO_URL}/tree/main/${path}`} key={path}>
                <Folder size={17} />
                {path}
                <span>
                  {path === "src/lib/"
                    ? "Scoring, data and wallet logic"
                    : path === "src/db/"
                      ? "Schema and migrations"
                      : "Browse source"}
                </span>
              </a>
            ))}
            <a href={`${REPO_URL}/blob/main/LICENSE`}>
              <FileCode2 size={17} />
              LICENSE<span>MIT License</span>
            </a>
          </div>
          <details className="repo-tree">
            <summary>Full repository tree / top two levels</summary>
            <pre>{REPO_TREE}</pre>
          </details>
          <p className="demo-note">
            Repository opens at launch. Paths reflect this source checkout; no
            stars, forks or contributor counts.
          </p>
        </div>
        <div className="source-terminal">
          <div className="fragment-title">
            <Terminal />
            Self-host in one command<span>After setup</span>
          </div>
          <pre>
            <code>{`# Repository available at launch
$ git clone https://github.com/getanyapi-com/lurk.git
$ cd lurk
$ cp .env.example .env
# Configure your keys, then:
$ docker compose up
Applying database migrations
migrations applied`}</code>
          </pre>
          <p>
            Docker starts the app and Postgres. Configure Clerk, AnyAPI,
            OpenRouter and the encryption key first.
          </p>
          <small>
            Expected startup excerpt from docker-entrypoint.sh and
            src/db/migrate.ts. Not a recorded deployment.
          </small>
        </div>
      </div>
    </section>
  );
}
