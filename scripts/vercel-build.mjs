// Vercel runs `npm run vercel-build` when this script exists.
// Migrations are opt-in (RUN_MIGRATIONS_ON_BUILD=1) so preview deployments
// never touch a database unless you choose to.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit", env: process.env });

if (process.env.RUN_MIGRATIONS_ON_BUILD === "1") {
  if (!process.env.DATABASE_URL) {
    console.error("[vercel-build] RUN_MIGRATIONS_ON_BUILD=1 but DATABASE_URL is not set");
    process.exit(1);
  }
  console.log("[vercel-build] applying database migrations");
  run("npx drizzle-kit migrate");
} else {
  console.log("[vercel-build] skipping migrations (set RUN_MIGRATIONS_ON_BUILD=1 to apply them during the build)");
}
run("npm run build");
