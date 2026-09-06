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
import { parseDestinations, parsePhrasings } from "@/lib/discovery/store";
import { buildProfile } from "@/lib/profile";
import { projectForUser } from "@/lib/projects";
import { tierForUser } from "@/lib/tier";

export type ChipKind = "keyword" | "subreddit" | "competitor";
/** What a person has decided about one row of the plan. */
export type ChipState = "active" | "pinned" | "excluded";
/** The two lists read off the product page itself, editable by hand. */
export type ListKind = "destination" | "phrasing";
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

/**
 * A row a person typed is theirs: it is marked `user`, which is what makes the
 * next discovery rebuild leave it exactly where it is.
 */
async function insertChip(kind: ChipKind, projectId: string, value: string) {
  const owned = { projectId, source: "user", state: "active" };
  if (kind === "keyword") {
    await db()
      .insert(projectKeywords)
      .values({ ...owned, keyword: value })
      .onConflictDoNothing();
    return;
  }
  if (kind === "subreddit") {
    await db()
      .insert(projectSubreddits)
      .values({ ...owned, name: value })
      .onConflictDoNothing();
    return;
  }
  await db()
    .insert(projectCompetitors)
    .values({ ...owned, name: value })
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

/**
 * Pins, excludes or restores one row of the plan. A pinned row is retrieved
 * and survives every rebuild; an excluded row is never retrieved and is not
 * offered again. Both outlive discovery, which is the point of them.
 */
export async function setChipStateAction(
  kind: ChipKind,
  projectId: string,
  value: string,
  state: ChipState,
): Promise<ChipResult> {
  try {
    const { project } = await ownedProject(projectId);
    if (kind === "keyword") {
      await db()
        .update(projectKeywords)
        .set({ state })
        .where(
          and(
            eq(projectKeywords.projectId, project.id),
            eq(projectKeywords.keyword, value),
          ),
        );
    } else if (kind === "subreddit") {
      await db()
        .update(projectSubreddits)
        .set({ state })
        .where(
          and(
            eq(projectSubreddits.projectId, project.id),
            eq(projectSubreddits.name, value),
          ),
        );
    } else {
      await db()
        .update(projectCompetitors)
        .set({ state })
        .where(
          and(
            eq(projectCompetitors.projectId, project.id),
            eq(projectCompetitors.name, value),
          ),
        );
      await bumpProfileVersion(project.id);
    }
    revalidatePath("/app/product");
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "That could not be changed.",
    };
  }
}

async function saveLists(
  projectId: string,
  destinations: { name: string; sourceText: string }[],
  phrasings: string[],
) {
  await db()
    .update(projects)
    .set({ destinations, problemPhrasings: phrasings })
    .where(eq(projects.id, projectId));
  revalidatePath("/app/product");
}

/**
 * Adds a place or a phrasing the page never said. Both feed the next round of
 * discovery queries, so this is how a person teaches the app a market or a way
 * of asking that their own page does not spell out.
 */
export async function addListItemAction(
  kind: ListKind,
  projectId: string,
  raw: string,
): Promise<ChipResult> {
  try {
    const { project } = await ownedProject(projectId);
    const value = raw.trim();
    if (!value) {
      return { error: "Type something first." };
    }
    const destinations = parseDestinations(project.destinations);
    const phrasings = parsePhrasings(project.problemPhrasings);
    if (kind === "destination") {
      if (!destinations.some((place) => place.name === value)) {
        destinations.push({ name: value, sourceText: "Added by you" });
      }
    } else if (!phrasings.includes(value)) {
      phrasings.push(value);
    }
    await saveLists(project.id, destinations, phrasings);
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "That could not be added.",
    };
  }
}

/** Removes one place or one phrasing from what discovery will ask about. */
export async function removeListItemAction(
  kind: ListKind,
  projectId: string,
  value: string,
) {
  const { project } = await ownedProject(projectId);
  const destinations = parseDestinations(project.destinations).filter(
    (place) => kind !== "destination" || place.name !== value,
  );
  const phrasings = parsePhrasings(project.problemPhrasings).filter(
    (phrase) => kind !== "phrasing" || phrase !== value,
  );
  await saveLists(project.id, destinations, phrasings);
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
