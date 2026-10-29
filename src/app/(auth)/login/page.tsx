import { authMetadata } from "@/components/auth/meta";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/forms";
import { cleanTemplateId, one, safeNext } from "@/components/auth/params";
import { capabilities } from "@/lib/env";
import { clampIdea } from "@/lib/client/pending-idea";
import { Alert } from "@/components/ui/misc";

export const metadata = authMetadata("/login");

type SearchParams = Promise<{
  reset?: string;
  verified?: string;
  error?: string | string[];
  next?: string | string[];
  email?: string | string[];
  prompt?: string | string[];
  template?: string | string[];
}>;

/** Why a GitHub sign-in came back here (/api/auth/github/callback redirects with ?error=github_<code>). */
const GITHUB_ERRORS: Record<string, string> = {
  github_denied: "GitHub sign-in was cancelled. You can try again or use your email.",
  github_not_configured: "GitHub sign-in isn't configured on this deployment. Sign in with your email instead.",
  github_no_verified_email: "Your GitHub account has no verified email address. Verify one on GitHub, or sign in with email.",
  github_account_disabled: "This account is disabled. Contact support if you think this is a mistake.",
};

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const error = one(sp.error);
  const githubError = error?.startsWith("github_") ? (GITHUB_ERRORS[error] ?? "GitHub sign-in didn't finish. Please try again.") : null;
  const next = one(sp.next);
  const prompt = clampIdea(one(sp.prompt)) || undefined;

  return (
    <AuthCard title="Welcome back" description="Sign in to pick up your projects, previews and deploys.">
      {sp.reset ? (
        <Alert variant="success" className="mb-5">
          Your password was updated. Sign in with your new password.
        </Alert>
      ) : null}
      {sp.verified ? (
        <Alert variant="success" title="Email verified" className="mb-5">
          Sign in to continue.
        </Alert>
      ) : null}
      {githubError ? (
        <Alert variant="warning" className="mb-5">
          {githubError}
        </Alert>
      ) : null}
      <LoginForm
        githubEnabled={capabilities.github}
        next={next ? safeNext(next, "") || undefined : undefined}
        email={one(sp.email)?.slice(0, 254)}
        prompt={prompt}
        template={prompt ? cleanTemplateId(one(sp.template)) : undefined}
      />
    </AuthCard>
  );
}
