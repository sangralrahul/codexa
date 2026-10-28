import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess, roleAtLeast } from "@/lib/services/access";
import { disableCloud, enableCloud, getCloudStatus } from "@/lib/services/cloud";

type Ctx = { params: Promise<{ id: string }> };

/** GET /cloud → status, API base URL, counts and collections. */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project, role } = await assertProjectAccess(user, id, "viewer");
  return json({ ...(await getCloudStatus(project)), canEdit: roleAtLeast(role, "editor") });
});

/** POST /cloud → turn Cloud on: writes the client SDK into the project and sets the flag. */
export const POST = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  const { sdkPath } = await enableCloud(project, user.id);
  const fresh = await assertProjectAccess(user, id, "editor");
  return json({ ...(await getCloudStatus(fresh.project)), canEdit: true, sdkPath });
});

/** DELETE /cloud → turn Cloud off. The app API stops answering; data and users are kept. */
export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { project } = await assertProjectAccess(user, id, "editor");
  await disableCloud(project, user.id);
  return json({ enabled: false });
});
