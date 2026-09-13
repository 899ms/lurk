import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Every file under src, as a path relative to the repository root. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

/**
 * An em or en dash is invisible in review and survives into shipped copy, where
 * it reads as machine-written. The only enforcement that holds is a test.
 */
describe("dashes in the source", () => {
  it("has no em dash or en dash anywhere under src", () => {
    const offenders = sourceFiles("src").filter((path) =>
      /[–—]/.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
