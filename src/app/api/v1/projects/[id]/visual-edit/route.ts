import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { assertProjectAccess } from "@/lib/services/access";
import { applyVisualEdits } from "@/lib/services/visual-edit";

type Ctx = { params: Promise<{ id: string }> };

const edit = z.object({ kind: z.enum(["text", "class"]), from: z.string().min(1).max(2000), to: z.string().max(2000) });
const bodySchema = z.object({ edits: z.array(edit).min(1).max(6) });

/**
 * POST /api/v1/projects/:id/visual-edit → { results, changed, before }
 * Applies preview edits that match exactly one place in the source; the rest come back unapplied
 * so the editor can hand them to the AI agent. `before` holds the previous content for undo.
 */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  await enforceRateLimit(`visual-edit:user:${user.id}`, 60, 60_000);
  const body = await parseBody(req, bodySchema);
  return json(await applyVisualEdits(id, user.id, body.edits));
});
