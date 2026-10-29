import { ApiError, projectsApi } from "../lib/api";
import { nameFromPrompt } from "../lib/util";
import { toast } from "../ui";

export const DEFAULT_TEMPLATE = "vite-react-starter";

/** Creates a project in the current workspace and returns its id (null after showing the error). */
export async function createProject(workspaceId: string | undefined, input: { templateId?: string; name?: string; prompt?: string }): Promise<string | null> {
  if (!workspaceId) {
    toast.error("No workspace", "Open Settings to check your workspace access.");
    return null;
  }
  const prompt = input.prompt?.trim();
  try {
    const { project } = await projectsApi.create({
      workspaceId,
      name: (input.name ?? (prompt ? nameFromPrompt(prompt) : "")) || "Untitled project",
      description: prompt ? prompt.slice(0, 500) : undefined,
      templateId: input.templateId ?? DEFAULT_TEMPLATE,
    });
    return project.id;
  } catch (err) {
    toast.error("Couldn't create the project", err instanceof ApiError ? err.message : undefined);
    return null;
  }
}
