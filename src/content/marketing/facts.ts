/**
 * Numbers shown on marketing pages, computed from the code that enforces them (PLAN §1):
 * never typed into copy. Server-only use (it reads the template registry and the agent limits).
 */
import { TEMPLATES } from "@/templates";
import { TEMPLATE_SHOTS } from "@/components/templates/shots";
import { COMMANDS, toolSchemas } from "@/lib/ai/tools/schemas";
import { LIMITS } from "@/lib/ai/agent";
import { workspaceRoleEnum } from "@/db/schema";
import { PLANS, PLAN_ORDER, isUnlimited } from "@/config/plans";

export const FACTS = {
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
