"use server";

import { revalidatePath } from "next/cache";
import { requireLocalUser } from "@/lib/auth";
import { createProject } from "@/lib/projects";

export async function createProjectAction(formData: FormData) {
  const user = await requireLocalUser();
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!name) {
    throw new Error("A project needs a name");
  }
  await createProject(user.id, name, url || null);
  revalidatePath("/app", "layout");
}
