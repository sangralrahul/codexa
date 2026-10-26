import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { roleAtLeast } from "@/lib/services/access";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries } from "@/components/projects/template-summaries";
import { OnboardingFlow } from "@/components/projects/onboarding-flow";
import { Backdrop } from "@/components/marketing/backdrop";
import { LogoMark } from "@/components/logo";
import { UserMenu } from "@/components/app/user-menu";

export const metadata = { title: "Get started", robots: { index: false } };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  if (user.onboardedAt) redirect("/dashboard");
  const { current } = await getCurrentWorkspace(user);
  const workspaceId = current && roleAtLeast(current.role, "editor") ? current.workspace.id : null;
  return (
    // Full screen (no sidebar): the live gradient behind a focused three-step setup.
    <div className="relative isolate flex min-h-dvh flex-col">
      <Backdrop className="-z-10" />
      <header className="flex h-16 items-center justify-between px-5 sm:px-8">
        <span className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="text-[13px] font-semibold uppercase tracking-[0.2em]">Codexa</span>
        </span>
        <UserMenu user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }} />
      </header>
      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
      <OnboardingFlow
        user={{ name: user.name, timezone: user.timezone, locale: user.locale }}
        workspaceId={workspaceId}
        templates={listTemplateSummaries().filter((t) => t.featured || t.difficulty === "beginner")}
        defaultTemplateId={DEFAULT_TEMPLATE_ID}
      />
      </div>
    </div>
  );
}
