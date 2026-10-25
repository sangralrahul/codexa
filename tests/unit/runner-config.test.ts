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

  it("reports no runtime on serverless hosts without RUNNER_URL or a container binding", async () => {
    const m = await load({ RUNNER_URL: undefined, VERCEL: "1" });
    const { cloudflareContext, setCloudflareContext } = await import("@/lib/cloudflare/bindings");
    const saved = cloudflareContext();
    try {
      setCloudflareContext({ env: {} });
      expect(m.runnerUrl()).toBeNull();
      expect(m.capabilities.runner).toBe(false);
      expect(m.runtimeSetupHint()).toMatch(/No runtime is configured/);
      setCloudflareContext({ env: { SANDBOX: {} as never } });
      expect(m.capabilities.runner).toBe(true);
      expect(m.runtimeSetupHint()).toBeNull();
    } finally {
      setCloudflareContext(saved);
    }
  });

  it("keeps Cloudflare containers off without preview/site hosts (workers.dev, no domain)", async () => {
    const m = await load({ RUNNER_URL: undefined, VERCEL: "1", PREVIEW_HOST: "", DEPLOY_HOST: "" });
    const { cloudflareContext, setCloudflareContext } = await import("@/lib/cloudflare/bindings");
    const saved = cloudflareContext();
    try {
      setCloudflareContext({ env: { SANDBOX: {} as never } });
      expect(m.containersEnabled()).toBe(false);
      expect(m.capabilities.runner).toBe(false);
      expect(m.runtimeSetupHint()).toMatch(/need your own domain/);
    } finally {
      setCloudflareContext(saved);
    }
    const withDomain = await load({ RUNNER_URL: undefined, VERCEL: "1", PREVIEW_HOST: "preview.example.com", DEPLOY_HOST: "sites.example.com" });
    const b = await import("@/lib/cloudflare/bindings");
    const before = b.cloudflareContext();
    try {
      b.setCloudflareContext({ env: { SANDBOX: {} as never } });
      expect(withDomain.containersEnabled()).toBe(true);
    } finally {
      b.setCloudflareContext(before);
    }
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

describe("secrets during `next build`", () => {
  it("uses placeholders while building, so a machine without the real secrets can build", async () => {
    const m = await load({ SESSION_SECRET: undefined, ENCRYPTION_KEY: undefined, NEXT_PHASE: "phase-production-build" });
    expect(m.env.SESSION_SECRET).toBe("build-time-placeholder-not-a-secret");
  });

  it("still refuses to start at runtime without them", async () => {
    await expect(load({ SESSION_SECRET: undefined, ENCRYPTION_KEY: undefined, NEXT_PHASE: undefined })).rejects.toThrow(/SESSION_SECRET/);
  });
});
