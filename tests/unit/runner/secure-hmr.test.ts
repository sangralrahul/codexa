import { describe, expect, it } from "vitest";
import { secureHmr } from "../../../services/runner/sessions";
import { VITE_CONFIG } from "@/templates/shared";

const LEGACY = VITE_CONFIG.replace('protocol: process.env.CODEXA_PREVIEW_PROTOCOL === "https" ? "wss" : "ws" }', 'protocol: "ws" }');

describe("secureHmr", () => {
  it("lets an older project's Vite config follow the preview's protocol", () => {
    const files = { "vite.config.ts": LEGACY, "src/App.tsx": "x" };
    const out = secureHmr(files);
    expect(out["vite.config.ts"]).toBe(VITE_CONFIG);
    expect(out["src/App.tsx"]).toBe("x");
    expect(files["vite.config.ts"]).toBe(LEGACY);
  });

  it("leaves current and custom configs alone", () => {
    const files = { "vite.config.ts": VITE_CONFIG };
    expect(secureHmr(files)).toBe(files);
    const custom = { "vite.config.js": 'export default { server: { hmr: { protocol: "ws" } } }' };
    expect(secureHmr(custom)).toBe(custom);
  });
});
