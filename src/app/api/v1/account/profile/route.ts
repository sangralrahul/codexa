import { z } from "zod";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { toSafeUser } from "@/lib/auth/session";
import { isValidTimezone, LOCALES, updateProfile } from "@/lib/billing/account-service";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80).optional(),
  timezone: z.string().trim().min(1).max(64).refine(isValidTimezone, "Unknown timezone").optional(),
  locale: z.enum(LOCALES.map((l) => l.value) as [string, ...string[]]).optional(),
  avatarUrl: z.union([z.literal(""), z.string().trim().url("Enter a valid URL").max(500).refine((u) => u.startsWith("https://"), "Avatar URL must use https")]).nullable().optional(),
});

/** GET /api/v1/account/profile → { user } */
export const GET = handler(async () => json({ user: toSafeUser(await requireApiUser()) }));

/** PATCH /api/v1/account/profile { name?, timezone?, locale?, avatarUrl? } → { user } */
export const PATCH = handler(async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, schema);
  return json({ user: await updateProfile(user, body) });
});
