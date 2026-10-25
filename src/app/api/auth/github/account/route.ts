import { handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { capabilities } from "@/lib/env";
import { getGithubAccountDto, unlinkGithub } from "@/lib/github/accounts";
import { audit } from "@/lib/audit";

/** GET /api/auth/github/account → { configured, account: { linked, username } } */
export const GET = handler(async () => {
  const user = await requireApiUser();
  const account = await getGithubAccountDto(user.id);
  return json({ configured: capabilities.github, missing: capabilities.github ? [] : ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"], account });
});

/** DELETE /api/auth/github/account → unlink (deletes the oauth_accounts row and the stored token). */
export const DELETE = handler(async () => {
  const user = await requireApiUser();
  const removed = await unlinkGithub(user.id);
  if (removed) await audit({ actorId: user.id, action: "github.unlinked", targetType: "user", targetId: user.id });
  return json({ ok: true, removed });
});
