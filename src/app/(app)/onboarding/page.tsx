import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { roleAtLeast } from "@/lib/services/access";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries } from "@/components/projects/template-summaries";
import { OnboardingFlow } from "@/components/projects/onboarding-flow";

export const metadata = { title: "Get started", robots: { index: false } };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  if (user.onboardedAt) redirect("/dashboard");
  const { current } = await getCurrentWorkspace(user);
  const workspaceId = current && roleAtLeast(current.role, "editor") ? current.workspace.id : null;
  return (
    <div className="container-x py-10">
      <OnboardingFlow
        user={{ name: user.name, timezone: user.timezone, locale: user.locale }}
        workspaceId={workspaceId}
        templates={listTemplateSummaries().filter((t) => t.featured || t.difficulty === "beginner")}
        defaultTemplateId={DEFAULT_TEMPLATE_ID}
      />
    </div>
  );
}
