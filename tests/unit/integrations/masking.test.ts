import { describe, expect, it } from "vitest";
import { splitConfig, toConnectionDto } from "@/lib/integrations/masking";
import { SECRET_MASK } from "@/lib/integrations/types";
import { INTEGRATIONS, getIntegration, secretFieldKeys } from "@/config/integrations";
import { PROVIDER_ADAPTERS } from "@/lib/integrations/providers";

describe("integration directory", () => {
  it("has the stable shape every consumer relies on", () => {
    for (const i of INTEGRATIONS) {
      expect(typeof i.id).toBe("string");
      expect(["databases", "authentication", "ai", "payments", "email", "analytics", "storage", "hosting", "git", "productivity"]).toContain(i.category);
      expect(["available", "planned"]).toContain(i.status);
      expect(i.docsPath.startsWith("/")).toBe(true);
      expect(Array.isArray(i.capabilities)).toBe(true);
      for (const f of i.configFields) {
        expect(["text", "password", "url"]).toContain(f.type);
        expect(typeof f.required).toBe("boolean");
      }
    }
    expect(new Set(INTEGRATIONS.map((i) => i.id)).size).toBe(INTEGRATIONS.length);
  });
  it("has an adapter for every available provider with config fields", () => {
    for (const i of INTEGRATIONS.filter((x) => x.status === "available" && x.configFields.length)) expect(PROVIDER_ADAPTERS[i.id], i.id).toBeDefined();
  });
});

describe("config masking", () => {
  it("splits secrets from config using the provider definition", () => {
    const { config, secret, secretKeys } = splitConfig("supabase", { projectUrl: "https://x.supabase.co", anonKey: "anon", connectionString: "postgres://u:p@h/db", extra: "1" });
    expect(config).toEqual({ projectUrl: "https://x.supabase.co", anonKey: "anon", extra: "1" });
    expect(secret).toEqual({ connectionString: "postgres://u:p@h/db" });
    expect(secretKeys).toEqual(secretFieldKeys(getIntegration("supabase")!));
  });
  it("never returns secret values, even if one leaked into config", () => {
    const now = new Date();
    const dto = toConnectionDto(
      { id: "c1", workspaceId: "w", provider: "postgres", name: "db", config: { ssl: "true", connectionString: "postgres://leaked" }, secretEnc: "v1.x.y.z", status: "unverified", lastTestedAt: null, lastError: null, createdBy: null, createdAt: now, updatedAt: now },
      ["connectionString"],
    );
    expect(dto.config).toEqual({ ssl: "true", connectionString: SECRET_MASK });
    expect(JSON.stringify(dto)).not.toContain("leaked");
    expect(dto.secretKeys).toEqual(["connectionString"]);
    expect(dto.status).toBe("unverified");
  });
});
