import "server-only";
import { FRAMEWORKS, TEMPLATES } from "@/templates";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import { templatePreviewHref } from "@/components/templates/template-card";
import { toolSchemas } from "@/lib/ai/tools/schemas";
import { LIMITS } from "@/lib/ai/agent";
import { workspaceRoleEnum } from "@/db/schema";
import { PROVIDER_ADAPTERS } from "@/lib/integrations/providers";
import { INTEGRATION_CATEGORIES, INTEGRATIONS } from "@/config/integrations";
import { getIntegrationDetail } from "@/components/integrations-directory/details";
import { PLANS } from "@/config/plans";
import { buildChips, buildScenarios, buildStarters, stageTools } from "./scenarios";

/**
 * Everything the home page shows that comes from code or config (PLAN §1: no hard-coded
 * numbers). Computed per render on the server; only plain data crosses into client islands.
 */

export type ProofFact = { value: number; label: string; symbol: string; file: string };
export type WallTile = { id: string; name: string; frameworkName: string; categoryName: string; category: string; href: string };
export type ConstellationNode = { id: string; name: string; categoryName: string; description: string; href: string; operatorConfigured: boolean };

function frameworkFamilies() {
  const names: Record<string, [string, string]> = {
    "vite-react": ["React + Vite app", "React + Vite apps"],
    static: ["static site", "static sites"],
    "node-express": ["Express API", "Express APIs"],
  };
  const counts = new Map<string, number>();
  for (const t of TEMPLATES) counts.set(t.framework, (counts.get(t.framework) ?? 0) + 1);
  const parts = [...counts.entries()].map(([fw, n]) => {
    const [one, many] = names[fw] ?? [FRAMEWORKS[fw as keyof typeof FRAMEWORKS]?.name ?? fw, FRAMEWORKS[fw as keyof typeof FRAMEWORKS]?.name ?? fw];
    return `${n} ${n === 1 ? one : many}`;
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

export function getHomeData() {
  const scenarios = buildScenarios();
  const staged = new Set(scenarios.map((s) => s.id));
  const starters = buildStarters(staged);
  const tools = stageTools();
  const categoryName = (id: string) => INTEGRATION_CATEGORIES.find((c) => c.id === id)?.name ?? id;

  const proof: ProofFact[] = [
    { value: TEMPLATES.length, label: "starter templates", symbol: "TEMPLATES.length", file: "src/templates" },
    { value: Object.keys(toolSchemas).length, label: "agent tools", symbol: "toolSchemas", file: "src/lib/ai/tools/schemas.ts" },
    { value: LIMITS.maxRepairAttempts, label: "repair attempts, at most", symbol: "LIMITS.maxRepairAttempts", file: "src/lib/ai/agent.ts" },
    { value: workspaceRoleEnum.enumValues.length, label: "workspace roles", symbol: "workspaceRoleEnum", file: "src/db/schema.ts" },
  ];

  const wall: WallTile[] = TEMPLATES.filter((t) => TEMPLATE_SHOTS.has(t.id)).map((t) => ({
    id: t.id,
    name: t.name,
    frameworkName: FRAMEWORKS[t.framework]?.name ?? t.framework,
    categoryName: starters.find((s) => s.id === t.id)?.categoryName ?? t.category,
    category: t.category,
    href: templatePreviewHref(t.id),
  }));

  // User-connectable integrations only: the providers registry plus GitHub (PLAN §2.5).
  const connectable = [...Object.keys(PROVIDER_ADAPTERS), "github"];
  const nodes: ConstellationNode[] = connectable
    .map((id) => INTEGRATIONS.find((i) => i.id === id && i.status === "available"))
    .filter((i): i is (typeof INTEGRATIONS)[number] => Boolean(i))
    .map((i) => ({
      id: i.id,
      name: i.name,
      categoryName: categoryName(i.category),
      description: i.description,
      href: `/integrations/${i.id}`,
      operatorConfigured: Boolean(getIntegrationDetail(i.id).operatorConfigured),
    }));

  return {
    scenarios,
    starters,
    tools,
    chips: buildChips(),
    maxRepairAttempts: LIMITS.maxRepairAttempts,
    proof,
    templateCount: TEMPLATES.length,
    frameworkSummary: frameworkFamilies(),
    wall,
    nodes,
    freePlan: { name: PLANS.free.name, isFree: PLANS.free.prices?.USD.month === 0 && PLANS.free.prices?.INR.month === 0 },
    defaultScenario: scenarios[0],
  };
}

export type HomeData = ReturnType<typeof getHomeData>;
