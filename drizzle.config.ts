import { defineConfig } from "drizzle-kit";

// Codexa's database is Cloudflare D1 (SQLite). drizzle-kit only generates the
// SQL migrations in ./drizzle; Wrangler applies them:
//   npx wrangler d1 migrations apply codexa --local    (development)
//   npx wrangler d1 migrations apply codexa --remote   (production)
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  strict: true,
  verbose: false,
});
