import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usageEvents, users, workspaces, type Job, type User, type Workspace } from "@/db/schema";
import { createUserWithWorkspace } from "@/lib/auth/users";
import { handlers } from "@/lib/jobs/handlers";

const suffix = Date.now().toString(36);
let user: User;
let workspace: Workspace;

beforeAll(async () => {
  const created = await createUserWithWorkspace({ email: `jobs-${suffix}@example.com`, password: "password123", name: "Jobs Tester", emailVerified: true });
  user = created.user;
  workspace = created.workspace;
});

afterAll(async () => {
  if (workspace) await db.delete(workspaces).where(eq(workspaces.id, workspace.id));
  if (user) await db.delete(users).where(eq(users.id, user.id));
});

describe("job handlers on D1", () => {
  it("usage.rollup sums only the last 24 hours", async () => {
    const before = (await handlers["usage.rollup"]({} as Job)) as { totals: Record<string, number> };
    await db.insert(usageEvents).values([
      { workspaceId: workspace.id, userId: user.id, kind: "deployment", quantity: 3 },
      { workspaceId: workspace.id, userId: user.id, kind: "deployment", quantity: 100, createdAt: new Date(Date.now() - 48 * 3600_000) },
    ]);
    const after = (await handlers["usage.rollup"]({} as Job)) as { totals: Record<string, number> };
    expect((after.totals.deployment ?? 0) - (before.totals.deployment ?? 0)).toBe(3);
  });
});
