import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { capabilities } from "@/lib/env";
import { getGithubAccountDto } from "@/lib/github/accounts";
import { GithubAccountCard } from "@/components/integrations/github-account";
import { safeNext } from "@/lib/github/oauth";

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
    <div className="container-x max-w-3xl py-8">
      <PageHeader title="Connect GitHub" description="Import repositories into Codexa and push your changes back. Codexa never force-pushes and never stores your token unencrypted." />
      <div className="space-y-8">
        <GithubAccountCard configured={capabilities.github} account={account} next={next} errorCode={sp.error ?? null} />
        <section aria-labelledby="scopes-title" className="glow-card rounded-2xl border border-border p-4">
          <h2 id="scopes-title" className="text-sm font-semibold">
            Permissions requested
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {SCOPES.map((s) => (
              <li key={s.scope} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
                <code className="shrink-0 font-mono text-xs text-primary sm:w-24">{s.scope}</code>
                <span className="text-muted-foreground">{s.why}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            The access token is encrypted at rest (AES-256-GCM) and only used server-side. Unlinking deletes it immediately.
          </p>
        </section>
        {account.linked ? (
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/dashboard/github" className="text-primary hover:underline">
              Browse your repositories
            </Link>
            <Link href="/import-project" className="text-primary hover:underline">
              Import a repository
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
