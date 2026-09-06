"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  projectCompetitors,
  projectKeywords,
  projectSubreddits,
  projects,
} from "@/db/schema";
import { scanNowAction } from "@/app/app/scan";
import { requireLocalUser } from "@/lib/auth";
import { buildProfile } from "@/lib/profile";
import { projectForUser } from "@/lib/projects";
import { tierForUser } from "@/lib/tier";

export type ChipKind = "keyword" | "subreddit" | "competitor";
export type ProfileState = { error: string | null; saved: boolean };
export type ChipResult = { error: string | null };

async function ownedProject(projectId: string) {
  const user = await requireLocalUser();
  const project = await projectForUser(user.id, projectId);
  if (!project) {
    throw new Error("That project is not yours");
  }
  return { user, project };
}

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function threshold(raw: string): number | null {
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(
      "The minimum score has to be a whole number between 0 and 100.",
    );
  }
  return value;
}

/**
 * Bumps the version of the facts a judgement is made against, so the next scan
 * judges every candidate again instead of trusting a verdict made against the
 * old product. The minimum score is not one of those facts: the feed applies it
 * when it is read, so moving it changes the next page load and nothing else.
 */
async function bumpProfileVersion(projectId: string) {
  await db()
    .update(projects)
    .set({ profileVersion: sql`${projects.profileVersion} + 1` })
    .where(eq(projects.id, projectId));
}

/** Saves the editable profile fields for one of the caller's projects. */
export async function saveProfileAction(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  try {
    const { project } = await ownedProject(text(formData, "projectId"));
    const name = text(formData, "name");
    if (!name) {
      return { error: "A project needs a name.", saved: false };
    }
    const facts = {
      name,
      url: text(formData, "url") || null,
      pain: text(formData, "pain") || null,
      solution: text(formData, "solution") || null,
      targetUsers: text(formData, "targetUsers") || null,
      geography: text(formData, "geography") || null,
      budgetFit: text(formData, "budgetFit") || null,
    };
    const edited = Object.entries(facts).some(
      ([field, value]) => project[field as keyof typeof facts] !== value,
    );
    await db()
      .update(projects)
      .set({
        ...facts,
        scoreThreshold: threshold(text(formData, "scoreThreshold")),
        ...(edited ? { profileVersion: sql`${projects.profileVersion} + 1` } : {}),
      })
      .where(eq(projects.id, project.id));
    revalidatePath("/app", "layout");
    return { error: null, saved: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Nothing was saved.",
      saved: false,
    };
  }
}

function clean(kind: ChipKind, value: string): string {
  const trimmed = value.trim();
  return kind === "subreddit"
    ? trimmed.replace(/^\/?r\//i, "").toLowerCase()
    : trimmed;
}

async function chipCount(kind: ChipKind, projectId: string): Promise<number> {
  if (kind === "keyword") {
    const rows = await db()
      .select()
      .from(projectKeywords)
      .where(eq(projectKeywords.projectId, projectId));
    return rows.length;
  }
  if (kind === "subreddit") {
    const rows = await db()
      .select()
      .from(projectSubreddits)
      .where(eq(projectSubreddits.projectId, projectId));
    return rows.length;
  }
  const rows = await db()
    .select()
    .from(projectCompetitors)
    .where(eq(projectCompetitors.projectId, projectId));
  return rows.length;
}

async function chipLimit(
  kind: ChipKind,
  userId: string,
): Promise<number | null> {
  const { limits } = await tierForUser(userId);
  if (!limits) {
    return null;
  }
  if (kind === "keyword") {
    return limits.keywordsPerProject;
  }
  return kind === "subreddit"
    ? limits.subredditsPerProject
    : limits.competitors;
}

const NOUNS: Record<ChipKind, string> = {
  keyword: "keywords",
  subreddit: "subreddits",
  competitor: "competitors",
};

async function insertChip(kind: ChipKind, projectId: string, value: string) {
  if (kind === "keyword") {
    await db()
      .insert(projectKeywords)
      .values({ projectId, keyword: value })
      .onConflictDoNothing();
    return;
  }
  if (kind === "subreddit") {
    await db()
      .insert(projectSubreddits)
      .values({ projectId, name: value })
      .onConflictDoNothing();
    return;
  }
  await db()
    .insert(projectCompetitors)
    .values({ projectId, name: value })
    .onConflictDoNothing();
}

/** Adds one keyword, subreddit or competitor, refusing past the tier cap. */
export async function addChipAction(
  kind: ChipKind,
  projectId: string,
  raw: string,
): Promise<ChipResult> {
  try {
    const { user, project } = await ownedProject(projectId);
    const value = clean(kind, raw);
    if (!value) {
      return { error: "Type something first." };
    }
    const limit = await chipLimit(kind, user.id);
    if (limit != null && (await chipCount(kind, project.id)) >= limit) {
      return {
        error: `This tier allows ${limit} ${NOUNS[kind]} per project. Connect an AnyAPI wallet for more.`,
      };
    }
    await insertChip(kind, project.id, value);
    if (kind === "competitor") {
      await bumpProfileVersion(project.id);
    }
    revalidatePath("/app/product");
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "That could not be added.",
    };
  }
}

/** Removes one keyword, subreddit or competitor from the project. */
export async function removeChipAction(
  kind: ChipKind,
  projectId: string,
  value: string,
) {
  const { project } = await ownedProject(projectId);
  if (kind === "keyword") {
    await db()
      .delete(projectKeywords)
      .where(
        and(
          eq(projectKeywords.projectId, project.id),
          eq(projectKeywords.keyword, value),
        ),
      );
  } else if (kind === "subreddit") {
    await db()
      .delete(projectSubreddits)
      .where(
        and(
          eq(projectSubreddits.projectId, project.id),
          eq(projectSubreddits.name, value),
        ),
      );
  } else {
    await db()
      .delete(projectCompetitors)
      .where(
        and(
          eq(projectCompetitors.projectId, project.id),
          eq(projectCompetitors.name, value),
        ),
      );
    await bumpProfileVersion(project.id);
  }
  revalidatePath("/app/product");
}

/** Reads the product page again and replaces the profile it produced. */
export async function rebuildProfileAction(formData: FormData) {
  const { user, project } = await ownedProject(
    String(formData.get("projectId") ?? ""),
  );
  if (!project.url) {
    throw new Error("This project has no product URL to read.");
  }
  await buildProfile(project.id, user.id, project.url);
  await bumpProfileVersion(project.id);
  revalidatePath("/app", "layout");
}

/** Queues a scan and opens the leads the scan will fill. */
export async function scanAndOpenLeadsAction(formData: FormData) {
  const { project } = await ownedProject(
    String(formData.get("projectId") ?? ""),
  );
  await scanNowAction(project.id);
  redirect(`/app/leads?project=${project.id}`);
}
