import { appRoute, ok, preflight } from "../../_lib";

/** GET /api/apps/:projectId/auth/me → { data: { user } } (user is null when signed out or the token expired). */
export const GET = appRoute<{ projectId: string }>(async (_req, { actor }) => ok({ user: await actor() }));

export const OPTIONS = preflight;
