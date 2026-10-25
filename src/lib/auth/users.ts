import "server-only";
import { eq } from "drizzle-orm";
import { db, runBatch } from "@/db";
import { users, workspaces, workspaceMembers, type User, type Workspace } from "@/db/schema";
import { hashPassword } from "@/lib/crypto";
import { slugify } from "@/lib/utils";
import { adminEmails } from "@/lib/env";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

async function uniqueWorkspaceSlug(base: string) {
  let slug = slugify(base) || "workspace";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const exists = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, candidate)).limit(1);
    if (!exists.length) return candidate;
  }
  slug = `${slug}-${Math.random().toString(36).slice(2, 8)}`;
  return slug;
}

/**
 * Create a user plus their personal workspace in one transaction.
 * Returns the user and the workspace id.
 */
export async function createUserWithWorkspace(input: {
  email: string;
  password?: string;
  name?: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
}) {
  const email = normalizeEmail(input.email);
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const role = adminEmails().includes(email) ? "admin" : "user";
  const name = input.name?.trim() || email.split("@")[0];
  const slug = await uniqueWorkspaceSlug(name);

  const userId = crypto.randomUUID();
  const workspaceId = crypto.randomUUID();
  const [insertedUsers, insertedWorkspaces] = await runBatch([
    db
      .insert(users)
      .values({
        id: userId,
        email,
        passwordHash,
        name,
        avatarUrl: input.avatarUrl ?? null,
        role,
        emailVerifiedAt: input.emailVerified ? new Date() : null,
      })
      .returning(),
    db.insert(workspaces).values({ id: workspaceId, slug, name: `${name}'s workspace`, ownerId: userId }).returning(),
    db.insert(workspaceMembers).values({ workspaceId, userId, role: "owner" }),
  ]);
  return { user: (insertedUsers as User[])[0], workspace: (insertedWorkspaces as Workspace[])[0] };
}
