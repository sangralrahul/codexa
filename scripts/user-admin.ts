/**
 * Operator CLI for accounts on deployments without an email provider.
 *   npm run user:admin -- verify <email> [--remote]
 *   npm run user:admin -- make-admin <email> [--remote]
 * Runs SQL against the Codexa D1 database through Wrangler: the local
 * development database by default, or the deployed one with --remote.
 */
import { execFileSync } from "node:child_process";

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function main() {
  const args = process.argv.slice(2);
  const remote = args.includes("--remote");
  const [command, rawEmail] = args.filter((a) => !a.startsWith("--"));
  if (!command || !rawEmail || !["verify", "make-admin"].includes(command)) {
    console.error("Usage: npm run user:admin -- <verify|make-admin> <email> [--remote]");
    process.exit(2);
  }
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`Not an email address: ${rawEmail}`);
    process.exit(2);
  }
  const now = Date.now();
  const set = command === "verify" ? `email_verified_at = ${now}` : `role = 'admin'`;
  const statement = `UPDATE users SET ${set}, updated_at = ${now} WHERE email = ${sqlString(email)} RETURNING email;`;
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "codexa", remote ? "--remote" : "--local", "--json", "--command", statement], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    shell: process.platform === "win32",
  });
  const parsed = JSON.parse(out) as { results?: { email: string }[] }[];
  const updated = parsed[0]?.results?.length ?? 0;
  if (!updated) {
    console.error(`No user with email ${email} in the ${remote ? "deployed" : "local"} database`);
    process.exitCode = 1;
    return;
  }
  console.log(command === "verify" ? `Verified ${email}` : `${email} is now an admin`);
}

main();
