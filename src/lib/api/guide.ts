import { readFile } from "node:fs/promises";
import { join } from "node:path";

let cached: string | null = null;

/** The agent guide, served to agents by the `describe` tool and at /agent-guide.md. */
export async function agentGuide(): Promise<string> {
  if (cached === null) {
    cached = await readFile(join(process.cwd(), "public", "agent-guide.md"), "utf8");
  }
  return cached;
}
