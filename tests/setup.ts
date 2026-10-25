import { config } from "dotenv";
import { afterAll } from "vitest";
import { initLocalBindings, disposeLocalBindings } from "@/lib/cloudflare/local";

config({ path: ".env.test", quiet: true });
config({ path: ".env.local", quiet: true });
config({ quiet: true });
Object.assign(process.env, { NODE_ENV: process.env.NODE_ENV ?? "test" });

// Real D1 and R2 (workerd + SQLite on disk) for every test file; see tests/global-setup.ts.
await initLocalBindings({ persistPath: ".wrangler/test-state/v3" });
afterAll(async () => {
  await disposeLocalBindings();
});
