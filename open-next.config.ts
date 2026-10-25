// OpenNext adapter configuration for Cloudflare Workers.
// Codexa pages are request-time rendered and do not use time-based
// revalidation, so the prerendered cache can live in Workers static assets
// (no R2 bucket or KV namespace needed).
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
