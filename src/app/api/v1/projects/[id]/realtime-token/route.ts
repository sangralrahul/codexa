import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess } from "@/lib/services/access";
import { env } from "@/lib/env";
import { colorForUser, issueRealtimeToken, REALTIME_TOKEN_TTL_MS } from "@/lib/integrations/realtime-token";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/projects/:id/realtime-token → { token, url, expiresAt, self: { userId, name, color } }
 * Signed with SESSION_SECRET; the realtime service verifies it with the same secret. 10 minute expiry.
 * `url` is null when NEXT_PUBLIC_REALTIME_URL is not configured (the client then reports presence as unavailable).
 */
export const GET = handler<Ctx>(async (_req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "viewer");
  const now = Date.now();
  const name = (user.name || user.email.split("@")[0]).slice(0, 60);
  const color = colorForUser(user.id);
  const token = issueRealtimeToken({ projectId: id, userId: user.id, name, color }, env.SESSION_SECRET, now);
  const url = env.NEXT_PUBLIC_REALTIME_URL?.trim() || null;
  return json({ token, url, expiresAt: new Date(now + REALTIME_TOKEN_TTL_MS).toISOString(), self: { userId: user.id, name, color } });
});
