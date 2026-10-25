import { handler } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { exportAccount } from "@/lib/billing/account-service";

/** GET /api/v1/account/export → JSON download of profile, workspaces, and owned projects with files. */
export const GET = handler(async () => {
  const user = await requireApiUser();
  await enforceRateLimit(`account:export:${user.id}`, 5, 60 * 60_000);
  const data = await exportAccount(user);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="codexa-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
