/**
 * Writes src/lib/content/api-manifest.generated.json: which documented API
 * endpoints have a route handler in the source tree. The API reference uses it
 * on hosts that do not ship src/ (e.g. Vercel). Runs automatically before
 * `npm run build`; a unit test fails if the committed file is stale.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { buildApiManifest } from "../src/lib/content/api-registry-fs";

const out = path.join(process.cwd(), "src", "lib", "content", "api-manifest.generated.json");
const manifest = buildApiManifest(process.cwd());
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
const implemented = Object.values(manifest).filter((m) => m.resolvedStatus === "implemented").length;
console.log(`[api-manifest] ${implemented}/${Object.keys(manifest).length} endpoints implemented -> ${path.relative(process.cwd(), out)}`);
