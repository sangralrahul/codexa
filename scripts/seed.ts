/**
 * Development seed: creates an admin user, a demo user, default feature flags.
 * Never run against production. Usage: npm run db:seed
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { users, featureFlags } from "../src/db/schema";
import { createUserWithWorkspace } from "../src/lib/auth/users";

async function ensureUser(email: string, password: string, name: string, role: "user" | "admin") {
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    if (existing[0].role !== role) await db.update(users).set({ role }).where(eq(users.id, existing[0].id));
    return existing[0];
  }
  const { user } = await createUserWithWorkspace({ email, password, name, emailVerified: true });
  if (role !== user.role) await db.update(users).set({ role }).where(eq(users.id, user.id));
  return user;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");
  const admin = await ensureUser("admin@codexa.local", "admin12345", "Codexa Admin", "admin");
  const demo = await ensureUser("demo@codexa.local", "demo12345", "Demo User", "user");
  const flags = [
    { key: "ai.generation", enabled: true, description: "Allow AI generation runs" },
    { key: "deploy.vercel", enabled: false, description: "Expose the Vercel deployment provider" },
    { key: "showcase.submissions", enabled: true, description: "Allow community showcase submissions" },
  ];
  for (const f of flags) {
    await db.insert(featureFlags).values(f).onConflictDoNothing();
  }
  console.log("Seeded:");
  console.log(`  admin: ${admin.email} / admin12345`);
  console.log(`  demo:  ${demo.email} / demo12345`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
