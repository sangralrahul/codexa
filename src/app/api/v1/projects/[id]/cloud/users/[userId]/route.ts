import { handler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { deleteAppUser } from "@/lib/services/cloud";
import { logActivity } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string; userId: string }> };

/** DELETE /cloud/users/:userId → removes the user, their sessions and the records they own. */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id, userId } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  await deleteAppUser(id, userId);
  await logActivity(id, user.id, "cloud.user_deleted", "Deleted an app user", { appUserId: userId });
  return new Response(null, { status: 204 });
});
