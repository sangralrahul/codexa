import "@/components/auth/onboarding/onboarding.css";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { roleAtLeast } from "@/lib/services/access";
import { capabilities } from "@/lib/env";
import { DEFAULT_TEMPLATE_ID, listTemplateSummaries } from "@/components/projects/template-summaries";
import { OnboardingFlow } from "@/components/projects/onboarding-flow";
import { UserMenu } from "@/components/app/user-menu";
import { cleanTemplateId, one } from "@/components/auth/params";
import { clampIdea, ideaHref } from "@/lib/client/pending-idea";

export const metadata = { title: "Get started", robots: { index: false } };

type SearchParams = Promise<{ start?: string | string[]; prompt?: string | string[]; template?: string | string[] }>;

export default async function OnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/onboarding");
  const sp = await searchParams;
  // An idea in the URL (sign-up passes it only when the browser could not store it), clamped and kept as text.
  const prompt = clampIdea(one(sp.prompt));
  const templateId = cleanTemplateId(one(sp.template));
  if (user.onboardedAt) redirect(prompt ? ideaHref("/dashboard", prompt, templateId) : "/dashboard");
  const { current } = await getCurrentWorkspace(user);
  const workspaceId = current && roleAtLeast(current.role, "editor") ? current.workspace.id : null;
  return (
    // Full screen (no sidebar; the app shell treats /onboarding as a focus route). Static app lighting only: no canvas in the app.
    <OnboardingFlow
      user={{ name: user.name, email: user.email, timezone: user.timezone, locale: user.locale }}
      workspaceId={workspaceId}
      workspaceName={current?.workspace.name ?? null}
      templates={listTemplateSummaries()}
      defaultTemplateId={DEFAULT_TEMPLATE_ID}
      aiConfigured={capabilities.ai}
      carried={prompt ? { prompt, templateId } : undefined}
      userMenu={<UserMenu user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }} />}
    />
  );
}
