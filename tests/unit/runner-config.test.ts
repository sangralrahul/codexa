import { afterEach, describe, expect, it, vi } from "vitest";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  vi.resetModules();
});

async function load(envPatch: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(envPatch)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.resetModules();
  return import("@/lib/env");
}

describe("runner and app URL configuration", () => {
  it("defaults the runner to localhost in development", async () => {
    const m = await load({ RUNNER_URL: undefined, VERCEL: undefined, NODE_ENV: "development" });
    expect(m.runnerUrl()).toBe("http://127.0.0.1:4000");
    expect(m.capabilities.runner).toBe(true);
  });

  it("reports no runner on Vercel when RUNNER_URL is unset", async () => {
    const m = await load({ RUNNER_URL: undefined, VERCEL: "1" });
    expect(m.runnerUrl()).toBeNull();
    expect(m.capabilities.runner).toBe(false);
  });

  it("treats an empty RUNNER_URL as unset", async () => {
    const m = await load({ RUNNER_URL: "", VERCEL: "1" });
    expect(m.runnerUrl()).toBeNull();
  });

  it("uses an explicit RUNNER_URL everywhere", async () => {
    const m = await load({ RUNNER_URL: "https://runner.example.com", VERCEL: "1" });
    expect(m.runnerUrl()).toBe("https://runner.example.com");
  });

  it("derives APP_URL from Vercel system variables when unset", async () => {
    const m = await load({ APP_URL: undefined, VERCEL_ENV: "preview", VERCEL_URL: "codexa-abc.vercel.app" });
    expect(m.env.APP_URL).toBe("https://codexa-abc.vercel.app");
    const p = await load({ APP_URL: undefined, VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "codexa.vercel.app", VERCEL_URL: "codexa-abc.vercel.app" });
    expect(p.env.APP_URL).toBe("https://codexa.vercel.app");
  });
});
