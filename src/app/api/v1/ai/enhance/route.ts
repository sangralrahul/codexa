import { z } from "zod";
import { ApiError, handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { ENHANCE_MAX_INPUT, enhancePrompt } from "@/lib/ai/enhance";

const bodySchema = z.object({
  prompt: z.string().trim().min(3, "Write a few words first").max(ENHANCE_MAX_INPUT),
  projectId: z.string().min(1).max(64).optional().nullable(),
});

/** POST /api/v1/ai/enhance → { prompt }: rewrite a one-line idea into a detailed build brief. */
export const POST = handler(async (req) => {
  const user = await requireApiUser();
  await enforceRateLimit(`ai:enhance:user:${user.id}`, 10, 60_000);
  const body = await parseBody(req, bodySchema);
  let workspaceId: string;
  if (body.projectId) {
    const { workspace } = await assertProjectAccess(user, body.projectId, "editor");
    workspaceId = workspace.id;
  } else {
    const { current } = await getCurrentWorkspace(user);
    if (!current) throw new ApiError(400, "No workspace", "no_workspace");
    workspaceId = current.workspace.id;
  }
  const prompt = await enhancePrompt({ workspaceId, userId: user.id, projectId: body.projectId ?? null, prompt: body.prompt });
  return json({ prompt });
});
