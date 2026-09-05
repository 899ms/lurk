import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export type LocalUser = typeof users.$inferSelect;

/**
 * The local row for the signed-in Clerk user, created on first authenticated
 * request. Returns null when there is no session.
 */
export async function currentLocalUser(): Promise<LocalUser | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
  const rows = await db()
    .insert(users)
    .values({ clerkUserId: clerkUser.id, email })
    .onConflictDoUpdate({ target: users.clerkUserId, set: { email } })
    .returning();
  if (rows[0]) {
    return rows[0];
  }
  const existing = await db().select().from(users).where(eq(users.clerkUserId, clerkUser.id));
  return existing[0] ?? null;
}

/**
 * The row for the caller, or a redirect to sign-in. Every page, route handler
 * and server action that touches tenant data calls this; nothing relies on the
 * proxy matching a path.
 */
export async function requireLocalUser(): Promise<LocalUser> {
  const user = await currentLocalUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}
