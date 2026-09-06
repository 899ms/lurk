"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLocalUser } from "@/lib/auth";
import { buildProfile } from "@/lib/profile";
import { createProject } from "@/lib/projects";

export type NewProjectState = { error: string | null };

function sentence(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Creates the project, builds its profile, then opens the Product page. */
export async function createProjectAndProfileAction(
  _previous: NewProjectState,
  formData: FormData,
): Promise<NewProjectState> {
  const user = await requireLocalUser();
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!name) {
    return { error: "A project needs a name." };
  }
  if (!url) {
    return { error: "A product URL is needed before we can read your site." };
  }

  let projectId: string;
  try {
    const project = await createProject(user.id, name, url);
    if (!project) {
      return { error: "The project could not be created." };
    }
    projectId = project.id;
  } catch (error) {
    return { error: sentence(error) };
  }

  try {
    await buildProfile(projectId, user.id, url);
  } catch (error) {
    return {
      error: `${name} was created but its profile could not be built: ${sentence(error)} Open the project and press Rebuild profile.`,
    };
  }

  revalidatePath("/app", "layout");
  redirect(`/app/product?project=${projectId}`);
}
