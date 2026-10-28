import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**",
    "drizzle/**",
    "node_modules/**",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
    ".open-next/**",
    ".wrangler/**",
    "containers/runner/dist/**",
    "desktop/node_modules/**",
    "desktop/dist/**",
    // Template kit sources; type-checked and built per template by scripts/capture-template-shots.ts.
    "templates-src/**",
  ]),
  // The Electron main process (desktop/) is CommonJS.
  { files: ["desktop/**/*.js"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
]);

export default eslintConfig;
