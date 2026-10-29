import { authMetadata } from "@/components/auth/meta";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/forms";
import { cleanTemplateId, one, safeNext } from "@/components/auth/params";
import { capabilities } from "@/lib/env";
import { clampIdea } from "@/lib/client/pending-idea";
import { getTemplate } from "@/templates";
import { PLANS } from "@/config/plans";

export const metadata = authMetadata("/signup");

type SearchParams = Promise<{ next?: string | string[]; email?: string | string[]; prompt?: string | string[]; template?: string | string[] }>;

/** "Free plan, no card. 3 projects, 50 AI requests a month." — from the plan config, so it stays true. */
function freePlanLine() {
  const { projects, aiRequestsPerMonth } = PLANS.free.limits;
  return `Free plan, no card. ${projects} projects, ${aiRequestsPerMonth.toLocaleString("en-US")} AI requests a month.`;
}

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  // The idea passport (PLAN §4.1): the homepage sentence, clamped to 2000 characters and rendered as text only.
  const prompt = clampIdea(one(sp.prompt));
  const templateId = cleanTemplateId(one(sp.template));
  const template = templateId ? getTemplate(templateId) : undefined;
  const idea = prompt ? { text: prompt, templateId: template?.id, templateName: template?.name } : null;
  const next = one(sp.next);
  const email = one(sp.email)?.slice(0, 254);

  return (
    <AuthCard
      title={idea ? "Create an account to build this" : "Create your account"}
      description={freePlanLine()}
    >
      <SignupForm githubEnabled={capabilities.github} next={next ? safeNext(next, "") || undefined : undefined} email={email} idea={idea} />
    </AuthCard>
  );
}
