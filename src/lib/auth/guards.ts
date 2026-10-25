import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import type { User } from "@/db/schema";

export class AuthError extends Error {
  status: number;
  constructor(message = "Unauthorized", status = 401) {
    super(message);
    this.status = status;
  }
}

/** For pages: redirect to login if not signed in. */
export async function requireUser(nextPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const q = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${q}`);
  }
  return user;
}

/** For API routes: throw an AuthError if not signed in. */
export async function requireApiUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin" && user.role !== "staff") redirect("/access-denied");
  return user;
}

export async function requireApiAdmin(): Promise<User> {
  const user = await requireApiUser();
  if (user.role !== "admin" && user.role !== "staff") throw new AuthError("Forbidden", 403);
  return user;
}

export function isStaff(user: Pick<User, "role">) {
  return user.role === "admin" || user.role === "staff";
}
