"use server";

import { revalidatePath } from "next/cache";
import { enqueueJob } from "@/jobs/enqueue";
import { requireLocalUser } from "@/lib/auth";
import { projectForUser } from "@/lib/projects";

/** Queues a scan for one of the caller's projects, replacing any queued scan. */
export async function scanNowAction(projectId: string) {
  const user = await requireLocalUser();
  if (!(await projectForUser(user.id, projectId))) {
    throw new Error("That project is not yours");
  }
  await enqueueJob("scan", projectId);
  revalidatePath("/app", "layout");
}
