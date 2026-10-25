/**
 * Compiles content/<section>/*.md into src/lib/content/content.generated.json
 * so production servers read docs from the bundle instead of the filesystem
 * (required on Cloudflare Workers). Runs before `npm run build` and
 * `npm run dev`; a unit test fails if the committed file is stale.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CONTENT_SECTIONS } from "../src/lib/content/types";

export function buildContentBundle(root = path.join(process.cwd(), "content")) {
  const out: Record<string, { file: string; raw: string }[]> = {};
  for (const section of CONTENT_SECTIONS) {
    const dir = path.join(root, section);
    if (!existsSync(dir)) continue;
    out[section] = readdirSync(dir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
      .sort()
      .map((file) => ({ file, raw: readFileSync(path.join(dir, file), "utf8") }));
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const out = path.join(process.cwd(), "src", "lib", "content", "content.generated.json");
  const bundle = buildContentBundle();
  writeFileSync(out, JSON.stringify(bundle, null, 1) + "\n");
  const count = Object.values(bundle).reduce((n, l) => n + l.length, 0);
  console.log(`[content-bundle] ${count} files -> ${path.relative(process.cwd(), out)}`);
}
