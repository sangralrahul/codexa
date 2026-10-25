import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { emails } from "@/lib/email";
import { env } from "@/lib/env";
import { issueToken, consumeToken } from "./tokens";
import { createUserWithWorkspace, findUserByEmail, normalizeEmail } from "./users";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { invalidateAllUserSessions } from "./session";
import { audit } from "@/lib/audit";
import { ApiError } from "@/lib/api";

export const PASSWORD_MIN = 8;

export function validatePassword(pw: string) {
  if (pw.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (pw.length > 256) return "Password is too long";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Use at least one letter and one number";
  return null;
}

export async function sendVerificationEmail(userId: string, email: string) {
  const token = await issueToken("verify_email", userId, email);
  const url = `${env.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await emails.verifyEmail(email, url);
}

export async function signUp(input: { email: string; password: string; name?: string; ip?: string | null }) {
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(email);
  if (existing) throw new ApiError(409, "An account with this email already exists", "email_taken");
  const { user, workspace } = await createUserWithWorkspace({ email, password: input.password, name: input.name });
  await sendVerificationEmail(user.id, email);
  await audit({ actorId: user.id, workspaceId: workspace.id, action: "user.signup", ip: input.ip });
  return { user, workspace };
}

export async function signIn(input: { email: string; password: string; ip?: string | null }) {
  const user = await findUserByEmail(input.email);
  // Always run the hash check to keep timing uniform.
  const ok = await verifyPassword(input.password, user?.passwordHash ?? "scrypt$AAAA$AAAA");
  if (!user || !ok || user.deletedAt) throw new ApiError(401, "Invalid email or password", "invalid_credentials");
  await audit({ actorId: user.id, action: "user.login", ip: input.ip });
  return user;
}

export async function verifyEmailToken(token: string) {
  const row = await consumeToken("verify_email", token);
  if (!row || !row.userId) return null;
  const [user] = await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, row.userId)).returning();
  return user ?? null;
}

export async function requestPasswordReset(emailRaw: string) {
  const user = await findUserByEmail(emailRaw);
  if (!user || user.deletedAt) return; // do not reveal existence
  const token = await issueToken("reset_password", user.id, user.email);
  const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await emails.resetPassword(user.email, url);
}

export async function resetPassword(token: string, newPassword: string) {
  const row = await consumeToken("reset_password", token);
  if (!row || !row.userId) throw new ApiError(400, "This reset link is invalid or has expired", "invalid_token");
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, row.userId));
  await invalidateAllUserSessions(row.userId);
  await audit({ actorId: row.userId, action: "user.password_reset" });
  return row.userId;
}
