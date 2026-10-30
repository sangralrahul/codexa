import Link from "next/link";
import { AppPage, PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { capabilities } from "@/lib/env";
import { getGithubAccountDto } from "@/lib/github/accounts";
import { GithubAccountCard } from "@/components/integrations/github-account";
import { safeNext } from "@/lib/github/oauth";
import { buttonClasses } from "@/components/ui/button";

export const metadata = { title: "Connect GitHub", robots: { index: false } };

const SCOPES = [
  { scope: "repo", why: "Read and write repositories you can access, so Codexa can import files and push commits to branches you choose." },
  { scope: "read:user", why: "Read your public profile (username, avatar) to show which account is linked." },
  { scope: "user:email", why: "Read your verified email address so sign-in with GitHub can match your Codexa account." },
];

export default async function ConnectGithubPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const user = await requireUser("/connect-github");
  const sp = await searchParams;
  const account = await getGithubAccountDto(user.id);
  const next = safeNext(sp.next ?? null, "/connect-github");
  return (
    <AppPage width="narrow">
      <PageHeader title="Connect GitHub" description="Import repositories into Codexa and push your changes back. Codexa never force-pushes and never stores your token unencrypted." />
      <div className="space-y-8">
        <GithubAccountCard configured={capabilities.github} account={account} next={next} errorCode={sp.error ?? null} />
        <section aria-labelledby="scopes-title" className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="px-5 pt-4">
            <h2 id="scopes-title" className="text-base font-semibold tracking-tight">
              Permissions requested
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">What Codexa can do with your GitHub account, and why.</p>
          </div>
          <ul className="mt-4">
            {SCOPES.map((s) => (
              <li key={s.scope} className="flex flex-col gap-1 border-t border-border px-5 py-3 text-sm sm:flex-row sm:gap-4">
                <code className="shrink-0 font-mono text-xs font-medium text-foreground sm:w-24 sm:pt-0.5">{s.scope}</code>
                <span className="text-muted-foreground">{s.why}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-border bg-surface/60 px-5 py-3 text-xs text-muted-foreground">
            The access token is encrypted at rest (AES-256-GCM) and only used server-side. Unlinking deletes it immediately.
          </p>
        </section>
        {account.linked ? (
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/dashboard/github" className={buttonClasses("outline", "sm")}>
              Browse your repositories
            </Link>
            <Link href="/import-project" className={buttonClasses("primary", "sm")}>
              Import a repository
            </Link>
          </div>
        ) : null}
      </div>
    </AppPage>
  );
}
