import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handler, json, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { toSafeUser } from "@/lib/auth/session";

const schema = z.object({
  name: z.string().trim().min(1, "Please tell us your name").max(80).optional(),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine((tz) => isValidTimezone(tz), "Unknown timezone")
    .optional(),
  locale: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "Invalid locale")
    .optional(),
  completed: z.boolean().optional(),
});

function isValidTimezone(tz: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** PATCH /api/v1/account/onboarding — update profile fields collected during onboarding and mark it complete. */
export const PATCH = handler(async (req) => {
  const user = await requireApiUser();
  const body = await parseBody(req, schema);
  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.timezone !== undefined) patch.timezone = body.timezone;
  if (body.locale !== undefined) patch.locale = body.locale;
  if (body.completed && !user.onboardedAt) patch.onboardedAt = new Date();
  const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
  return json({ user: toSafeUser(updated) });
});
