import { describe, expect, it } from "vitest";
import { DESIGN_RULES, designDirection } from "@/lib/ai/design";
import { buildSystemPrompt, buildUserMessage } from "@/lib/ai/prompts";
import type { ProjectContext } from "@/lib/ai/context";
import { TEMPLATES } from "@/templates";

const ctx = (framework: string): ProjectContext => ({
  framework,
  frameworkName: framework,
  settings: {},
  knowledge: "",
  tree: "",
  fileCount: 0,
  excerpts: [],
  lastError: null,
  runtime: { available: false, status: "stopped", previewUrl: null },
  recentLogs: null,
});

const PURPLE = /\b(purple|violet|indigo|fuchsia)\b|#(7c3aed|6d28d9|8b5cf6|6366f1|4f46e5|a855f7|9333ea)/i;

describe("design direction", () => {
  it("picks a direction from the subject", () => {
    expect(designDirection("A website for my coffee shop in Pune")?.id).toBe("food");
    expect(designDirection("An invoice tracker for freelancers")?.id).toBe("finance");
    expect(designDirection("Booking site for a dental clinic")?.id).toBe("health");
    expect(designDirection("Online store for handmade candles")?.id).toBe("commerce");
    expect(designDirection("A CRM for a small sales team")?.id).toBe("saas");
  });

  it("never suggests purple, violet, indigo or fuchsia", () => {
    const prompts = ["coffee shop", "fintech app", "yoga studio", "fashion boutique", "api monitor", "kids school", "hotel booking", "candle store", "saas dashboard", "something random", "zzz", "my idea"];
    for (const p of prompts) {
      const d = designDirection(p, p);
      expect(d?.text ?? "").not.toMatch(PURPLE);
    }
  });

  it("is stable for a project and stays out of the way when the user describes the look", () => {
    expect(designDirection("something random", "project-1")?.id).toBe(designDirection("something random", "project-1")?.id);
    expect(designDirection("A portfolio in dark mode with purple accents")).toBeNull();
    expect(designDirection("Landing page, minimal black and white")).toBeNull();
  });

  it("rules forbid the generic AI look", () => {
    expect(DESIGN_RULES).toMatch(/Never use purple, violet, indigo or fuchsia/);
    expect(DESIGN_RULES).toMatch(/gradient blobs/);
    expect(DESIGN_RULES).toMatch(/lorem ipsum/);
  });
});

describe("agent prompts", () => {
  it("adds the design standard for UI builds only", () => {
    expect(buildSystemPrompt("build", ctx("vite-react"))).toContain("DESIGN STANDARD");
    expect(buildSystemPrompt("build", ctx("node-express"))).not.toContain("DESIGN STANDARD");
    expect(buildSystemPrompt("ask", ctx("vite-react"))).not.toContain("DESIGN STANDARD");
  });

  it("adds a design direction to the first build request only", () => {
    expect(buildUserMessage("build", "A bakery website", ctx("vite-react"), [])).toContain("<design_direction>");
    expect(buildUserMessage("build", "A bakery website", ctx("vite-react"), [{ role: "user", content: "hi" }])).not.toContain("<design_direction>");
    expect(buildUserMessage("build", "A notes API", ctx("node-express"), [])).not.toContain("<design_direction>");
  });
});

describe("starter templates", () => {
  it("contain no purple, violet, indigo or fuchsia styling", () => {
    for (const t of TEMPLATES) {
      for (const [path, content] of Object.entries(t.files)) expect(`${t.id}/${path}: ${PURPLE.test(content) ? "has purple" : "ok"}`).toBe(`${t.id}/${path}: ok`);
    }
  });
});

describe("project knowledge", () => {
  it("goes into the system prompt and suppresses the design direction when it describes the look", () => {
    const withKnowledge = { ...ctx("vite-react"), knowledge: "Brand colour is forest green #166534. Never use emoji." };
    const system = buildSystemPrompt("build", withKnowledge);
    expect(system).toContain("<project_knowledge>");
    expect(system).toContain("Never use emoji.");
    expect(buildSystemPrompt("build", ctx("vite-react"))).not.toContain("PROJECT KNOWLEDGE");
    expect(buildUserMessage("build", "a bakery website", withKnowledge, [])).not.toContain("<design_direction>");
  });
});
