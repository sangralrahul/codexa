// Bundles the runner service (services/runner) into single files for the
// Cloudflare Container image. Run by `npm run container:build`, which
// `npm run cf:build` calls before the OpenNext build.
import { build } from "esbuild";
import { mkdirSync, rmSync } from "node:fs";

rmSync("containers/runner/dist", { recursive: true, force: true });
mkdirSync("containers/runner/dist", { recursive: true });
const common = {
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: false,
  logLevel: "warning",
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
};
await build({ ...common, entryPoints: ["services/runner/index.ts"], outfile: "containers/runner/dist/runner.mjs" });
await build({ ...common, entryPoints: ["services/runner/prepare.ts"], outfile: "containers/runner/dist/prepare.mjs" });
console.log("[container] runner bundled into containers/runner/dist");
