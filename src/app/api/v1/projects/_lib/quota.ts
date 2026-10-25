import { PLANS, isUnlimited } from "@/config/plans";
import { ApiError } from "@/lib/api";
import { countProjects } from "@/lib/services/projects";
import { getEffectivePlan } from "@/lib/services/usage";
import type { Workspace } from "@/db/schema";

/**
 * Enforce the per-workspace active project limit from the effective plan.
 * Throws 402 quota_exceeded (same shape as usage quota errors) when creating
 * one more project would exceed PLANS[plan].limits.projects.
 */
export async function assertProjectQuota(workspace: Pick<Workspace, "id" | "plan">) {
  const plan = await getEffectivePlan(workspace);
  const limit = PLANS[plan].limits.projects;
  const used = await countProjects(workspace.id);
  if (!isUnlimited(limit) && used + 1 > limit) {
    throw new ApiError(
      402,
      `Your ${PLANS[plan].name} plan allows ${limit} active project${limit === 1 ? "" : "s"} per workspace (${used}/${limit} used). Upgrade your plan or delete a project to continue.`,
      "quota_exceeded",
      { kind: "projects", used, limit, plan },
    );
  }
  return { plan, limit, used };
}
