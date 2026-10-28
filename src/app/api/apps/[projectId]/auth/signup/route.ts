import { z } from "zod";
import { parseBody } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { signUpAppUser } from "@/lib/services/cloud";
import { appRoute, ok, preflight } from "../../_lib";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(256),
  name: z.string().max(100).optional(),
});

/** POST /api/apps/:projectId/auth/signup → { data: { user, token, expiresAt } } */
export const POST = appRoute<{ projectId: string }>(async (req, { projectId, ip }) => {
  await enforceRateLimit(`cloud:signup:${projectId}:${ip}`, 20, 60 * 60_000);
  const body = await parseBody(req, schema);
  return ok(await signUpAppUser(projectId, body), 201);
});

export const OPTIONS = preflight;
