import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { limitsFor } from "./tiers";
import { config } from "./config";
import { walletConnection } from "./anyapi";

export type Project = typeof projects.$inferSelect;

export async function listProjects(userId: string): Promise<Project[]> {
  return db().select().from(projects).where(eq(projects.userId, userId)).orderBy(asc(projects.createdAt));
}

/** Creates a project, refusing when the user's tier is already at its limit. */
export async function createProject(userId: string, name: string, url: string | null) {
  const connected = (await walletConnection(userId)) !== null;
  const limits = limitsFor(connected ? "connected" : "free", config().SELF_HOSTED);
  if (limits?.projects != null) {
    const existing = await listProjects(userId);
    if (existing.length >= limits.projects) {
      throw new Error(`This tier allows ${limits.projects} projects. Connect a wallet for more.`);
    }
  }
  const rows = await db().insert(projects).values({ userId, name, url }).returning();
  return rows[0];
}
