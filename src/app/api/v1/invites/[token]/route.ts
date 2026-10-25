import { clientIp, handler, json, notFound } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { acceptInvite, previewInvite } from "@/lib/billing/team-service";
import { serializeWorkspace } from "@/app/api/v1/projects/_lib/serialize";

type Ctx = { params: Promise<{ token: string }> };

/** GET /api/v1/invites/:token → public preview { workspace, role, email, inviterName, expired, accepted, viewer } */
export const GET = handler<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  await enforceRateLimit(`invite:preview:${clientIp(req)}`, 60, 10 * 60_000);
  const preview = await previewInvite(token);
  if (!preview) throw notFound("Invitation");
  const user = await getCurrentUser();
  return json({ ...preview, viewer: user ? { email: user.email, matches: user.email.toLowerCase() === preview.email } : null });
});

/** POST /api/v1/invites/:token — accept (signed-in user whose email matches). */
export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { token } = await ctx.params;
  await enforceRateLimit(`invite:accept:${user.id}`, 20, 10 * 60_000);
  const workspace = await acceptInvite(token, user, clientIp(req));
  return json({ workspace: serializeWorkspace(workspace), next: "/dashboard" });
});
