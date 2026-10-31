/**
 * Numbers shown on marketing pages, computed from the code that enforces them (PLAN §1):
 * never typed into copy. Server-only use (it reads the template registry and the agent limits).
 */
import { TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_FRAMEWORKS } from "@/templates";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import { COMMANDS, toolSchemas } from "@/lib/ai/tools/schemas";
import { LIMITS } from "@/lib/ai/agent";
import { workspaceRoleEnum } from "@/db/schema";
import { PLANS, PLAN_ORDER, isUnlimited } from "@/config/plans";
import { scanProject } from "@/lib/services/site-checks";

/**
 * The pre-publish checks, counted by running the real scanner (`scanProject`, the same function the
 * Publish dialog calls through /checks) over two fixtures: a clean project, which yields every check
 * that always reports (pass or fail), and one that trips every conditional check. The union of
 * finding ids is the number of distinct checks; it moves when a check is added to site-checks.ts.
 */
function countPublishChecks(): { count: number; ids: string[] } {
  const clean = { "index.html": '<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Shop</title><meta name="description" content="A small shop with a real description." /><meta property="og:title" content="Shop" /><link rel="icon" href="/favicon.svg" /></head><body></body></html>', "src/App.tsx": 'export default function App() { return <a href="#top" id="top">Home</a>; }' };
  const dirty = {
    "index.html": "<html><head></head><body></body></html>",
    ".env": "VITE_SECRET_TOKEN=notreal",
    "src/App.tsx": [
      "const key = 'AKIAAAAAAAAAAAAAAAAA';",
      "eval('1'); el.innerHTML = '<b/>';",
      '<a target="_blank" href="/x">x</a>',
      '<img src="http://example.com/a.png">',
      '<a href="#missing">m</a>',
    ].join("\n"),
    "public/big.bin": "0".repeat(400_001),
  };
  const ids = new Set<string>();
  for (const f of [...scanProject(clean).findings, ...scanProject(dirty).findings]) ids.add(f.id);
  return { count: ids.size, ids: [...ids] };
}

const PUBLISH_CHECKS = countPublishChecks();

export const FACTS = {
  /** Distinct pre-publish checks (src/lib/services/site-checks.ts, scanProject). */
  publishChecks: PUBLISH_CHECKS.count,
  publishCheckIds: PUBLISH_CHECKS.ids,
  categories: TEMPLATE_CATEGORIES.length,
  runtimes: TEMPLATE_FRAMEWORKS.length,
  templates: TEMPLATES.length,
  templateShots: TEMPLATES.filter((t) => TEMPLATE_SHOTS.has(t.id)).length,
  agentTools: Object.keys(toolSchemas).length,
  sandboxCommands: COMMANDS.length,
  maxRepairAttempts: LIMITS.maxRepairAttempts,
  maxToolCalls: LIMITS.maxToolCalls,
  roles: workspaceRoleEnum.enumValues.length,
  roleNames: workspaceRoleEnum.enumValues,
  plans: PLAN_ORDER.length,
} as const;

/** "Up to 10", "Custom" etc. for a numeric plan limit. */
export function limitLabel(n: number, unit?: string): string {
  if (isUnlimited(n)) return "Custom";
  const s = new Intl.NumberFormat("en-US").format(n);
  return unit ? `${s} ${unit}` : s;
}

export const TEAM_LIMITS = PLANS.team.limits;
