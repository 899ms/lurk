import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

/**
 * What the product page can and cannot do is a fact the scorer judges against,
 * so it has to survive the profile build in its own columns, reach the scan's
 * product text, and invalidate every stored verdict when a person edits it.
 * Proven against a real database, because the columns are the whole point.
 */

const auth = vi.hoisted(() => ({ userId: "" }));

vi.mock("@/lib/auth", () => ({
  requireLocalUser: async () => ({ id: auth.userId }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

async function fixture(values: Record<string, unknown>) {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const [user] = await db()
    .insert(schema.users)
    .values({ clerkUserId: `test_${randomUUID()}` })
    .returning();
  const [project] = await db()
    .insert(schema.projects)
    .values({ userId: user.id, name: "HotelsAllow", ...values })
    .returning();
  auth.userId = user.id;
  return { user, project, db, schema };
}

describe.skipIf(!process.env.DATABASE_URL)("capabilities and exclusions", () => {
  it("reaches the scan's product text as what it can and does not do", async () => {
    const { user, project, db, schema } = await fixture({
      capabilities: ["check in guests aged 18 and over"],
      exclusions: ["anything outside the United States"],
    });
    const { loadScanProject } = await import("@/lib/scan/project");

    const loaded = await loadScanProject(project.id);
    expect(loaded?.productText).toContain("Can: check in guests aged 18 and over");
    expect(loaded?.productText).toContain("Does not: anything outside the United States");
    await db().delete(schema.users).where(eq(schema.users.id, user.id));
  });

  it("says neither line when the page named none", async () => {
    const { user, project, db, schema } = await fixture({});
    const { loadScanProject } = await import("@/lib/scan/project");

    const loaded = await loadScanProject(project.id);
    expect(loaded?.productText).not.toContain("Can:");
    expect(loaded?.productText).not.toContain("Does not:");
    await db().delete(schema.users).where(eq(schema.users.id, user.id));
  });

  it("judges everything again when one is edited, and not when a phrasing is", async () => {
    const { user, project, db, schema } = await fixture({});
    const { addListItemAction, removeListItemAction } = await import(
      "@/app/app/product/actions"
    );

    const version = async () =>
      (await db().select().from(schema.projects).where(eq(schema.projects.id, project.id)))[0]
        .profileVersion;

    await addListItemAction("phrasing", project.id, "hotels that let 19 year olds check in");
    expect(await version()).toBe(1);

    await addListItemAction("capability", project.id, "check in guests aged 18 and over");
    expect(await version()).toBe(2);
    await addListItemAction("exclusion", project.id, "anything outside the United States");
    expect(await version()).toBe(3);

    const loaded = await loadedLists(db, schema, project.id);
    expect(loaded.capabilities).toEqual(["check in guests aged 18 and over"]);
    expect(loaded.exclusions).toEqual(["anything outside the United States"]);
    expect(loaded.problemPhrasings).toEqual(["hotels that let 19 year olds check in"]);

    await removeListItemAction("capability", project.id, "check in guests aged 18 and over");
    expect(await version()).toBe(4);
    expect((await loadedLists(db, schema, project.id)).capabilities).toEqual([]);
    await db().delete(schema.users).where(eq(schema.users.id, user.id));
  });
});

async function loadedLists(
  db: typeof import("@/db")["db"],
  schema: typeof import("@/db/schema"),
  projectId: string,
) {
  const rows = await db().select().from(schema.projects).where(eq(schema.projects.id, projectId));
  return rows[0];
}
