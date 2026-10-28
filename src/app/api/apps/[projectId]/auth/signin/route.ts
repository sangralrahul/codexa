import { z } from "zod";
import { parseBody } from "@/lib/api";
import { normalizeEmail } from "@/lib/auth/users";
import { enforceRateLimit } from "@/lib/rate-limit";
import { signInAppUser } from "@/lib/services/cloud";
import { appRoute, ok, preflight } from "../../_lib";

const schema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(256) });

/** POST /api/apps/:projectId/auth/signin → { data: { user, token, expiresAt } } */
export const POST = appRoute<{ projectId: string }>(async (req, { projectId, ip }) => {
  await enforceRateLimit(`cloud:signin:${projectId}:${ip}`, 10, 60_000);
  const body = await parseBody(req, schema);
  await enforceRateLimit(`cloud:signin:${projectId}:email:${normalizeEmail(body.email)}`, 20, 15 * 60_000);
  return ok(await signInAppUser(projectId, body));
});

export const OPTIONS = preflight;
