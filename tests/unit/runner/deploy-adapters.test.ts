import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { siteSlug } from "@/lib/services/deployments";
import { buildVercelPayload, vercelProjectName, vercelUrl } from "@/lib/deploy/vercel";
import type { Project } from "@/db/schema";

const project = { id: "0f1e2d3c-4b5a-6978-8a9b-abcdef012345", slug: "my-app", framework: "vite-react", settings: { outputDir: "dist" } } as unknown as Project;

describe("siteSlug", () => {
  it("joins workspace and project slugs into one DNS label", () => {
    expect(siteSlug({ slug: "acme" }, project)).toBe("acme-my-app");
    expect(siteSlug({ slug: "Acme Inc" }, { ...project, slug: "x_y" })).toBe("acme-inc-x-y");
  });
  it("keeps the label at or below 63 characters and unique per project", () => {
    const long = siteSlug({ slug: "w".repeat(40) }, { ...project, slug: "p".repeat(40) });
    expect(long.length).toBeLessThanOrEqual(63);
    expect(long.endsWith(project.id.slice(0, 8))).toBe(true);
    expect(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(long)).toBe(true);
  });
});

describe("vercel adapter payload", () => {
  it("builds a v13 inline-files deployment with project settings", () => {
    const payload = buildVercelPayload({ deploymentId: "dep1", project, slug: "acme-my-app", files: { "index.html": "<h1>", "src/a.ts": "x" }, env: { SECRET: "s" } });
    expect(payload.name).toBe("acme-my-app");
    expect(payload.target).toBe("production");
    expect(payload.files).toEqual([
      { file: "index.html", data: "<h1>" },
      { file: "src/a.ts", data: "x" },
    ]);
    expect(payload.projectSettings.framework).toBe("vite");
    expect(payload.projectSettings.outputDirectory).toBe("dist");
    expect(payload.meta).toEqual({ codexaProjectId: project.id, codexaDeploymentId: "dep1" });
    // env vars are never sent as part of the payload (Vercel env is configured per project)
    expect(JSON.stringify(payload)).not.toContain("SECRET");
  });
  it("sanitises project names and adds the team id to URLs", () => {
    expect(vercelProjectName("Hello World!!")).toBe("hello-world");
    expect(vercelProjectName("---")).toBe("codexa-app");
    expect(vercelUrl("/v13/deployments", "team_1")).toBe("https://api.vercel.com/v13/deployments?teamId=team_1");
    expect(vercelUrl("/v13/deployments", undefined)).toBe("https://api.vercel.com/v13/deployments");
  });
});
