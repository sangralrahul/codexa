# minimatch (compat build)

The published `minimatch` 11.0.3, unchanged in `dist/`, plus two small entry files
(`compat.cjs`, `compat.mjs`) that also export the matcher as the default export.

Why: every minimatch below 11.0.1 is flagged by GHSA-g3hv-75wg-m249, but ESLint and its
plugins still call `minimatch(...)` the minimatch 3 way, which 11 removed. The root
`package.json` points every `minimatch` in the tree here through `overrides`.

Remove this folder and the override once ESLint and its plugins depend on minimatch 11 or later.
License: BlueOak-1.0.0 (see LICENSE.md), copyright Isaac Z. Schlueter and contributors.
