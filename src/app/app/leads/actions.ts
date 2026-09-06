"use server";

import { revalidatePath } from "next/cache";
import { requireLocalUser } from "@/lib/auth";
import { setLeadStatus } from "@/lib/leads";
import { projectForUser } from "@/lib/projects";

async function ownedProject(projectId: string) {
  const user = await requireLocalUser();
  if (!(await projectForUser(user.id, projectId))) {
    throw new Error("That project is not yours");
  }
}

/** Takes a lead out of the feed without saying anything about why. */
export async function hideLeadAction(projectId: string, leadId: string) {
  await ownedProject(projectId);
  await setLeadStatus(projectId, leadId, "hidden", null);
  revalidatePath("/app", "layout");
}

/** Records that a lead was a miss, with the reason the user picked. */
export async function markNotFitAction(projectId: string, leadId: string, formData: FormData) {
  await ownedProject(projectId);
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    throw new Error("Pick a reason before marking a lead as not a fit");
  }
  await setLeadStatus(projectId, leadId, "not_fit", reason);
  revalidatePath("/app", "layout");
}
