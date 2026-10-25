/**
 * Operator CLI for accounts on deployments without an email provider.
 *   npm run user:admin -- verify <email>     mark the email address as verified
 *   npm run user:admin -- make-admin <email> grant the admin role
 * Uses DATABASE_URL from the environment (or .env / .env.local).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { users } from "../src/db/schema";

async function main() {
  const [command, rawEmail] = process.argv.slice(2);
  if (!command || !rawEmail || !["verify", "make-admin"].includes(command)) {
    console.error("Usage: npm run user:admin -- <verify|make-admin> <email>");
    process.exit(2);
  }
  const email = rawEmail.trim().toLowerCase();
  const patch = command === "verify" ? { emailVerifiedAt: new Date() } : { role: "admin" as const };
  const rows = await db.update(users).set({ ...patch, updatedAt: new Date() }).where(eq(users.email, email)).returning({ id: users.id });
  if (!rows.length) {
    console.error(`No user with email ${email}`);
    process.exitCode = 1;
  } else {
    console.log(command === "verify" ? `Verified ${email}` : `${email} is now an admin`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
