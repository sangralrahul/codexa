/**
 * Runs once before the whole suite: recreate the local D1 test database
 * (.wrangler/test-state) and apply every migration in ./drizzle with Wrangler,
 * exactly as production migrations are applied.
 */
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

export default function setup() {
  rmSync(".wrangler/test-state", { recursive: true, force: true });
  execFileSync("npx", ["wrangler", "d1", "migrations", "apply", "codexa", "--local", "--persist-to", ".wrangler/test-state"], {
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, CI: "1" },
  });
}
