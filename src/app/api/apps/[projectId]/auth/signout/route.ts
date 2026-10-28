import { signOutAppUser } from "@/lib/services/cloud";
import { appRoute, ok, preflight } from "../../_lib";

/** POST /api/apps/:projectId/auth/signout — ends the session of the bearer token. */
export const POST = appRoute<{ projectId: string }>(async (_req, { projectId, token }) => {
  await signOutAppUser(projectId, token);
  return ok({ signedOut: true });
});

export const OPTIONS = preflight;
