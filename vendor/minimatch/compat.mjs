// minimatch 11.0.3 (patched for GHSA-g3hv-75wg-m249) with a default export for older callers
// (`import minimatch from "minimatch"`), alongside all of v11's named exports.
import { minimatch } from "./dist/esm/index.js";
export * from "./dist/esm/index.js";
export default minimatch;
