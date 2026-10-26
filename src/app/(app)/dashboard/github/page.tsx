import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { capabilities } from "@/lib/env";
import { getGithubAccountDto } from "@/lib/github/accounts";
import { GithubAccountCard } from "@/components/integrations/github-account";
import { GithubRepoBrowser } from "@/components/integrations/github-repo-browser";
import { buttonClasses } from "@/components/ui/button";

export const metadata = { title: "GitHub repositories", robots: { index: false } };

export default async function DashboardGithubPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser("/dashboard/github");
  const sp = await searchParams;
  const account = await getGithubAccountDto(user.id);
  const ready = capabilities.github && account.linked;
  return (
    <div className="container-x py-8">
      <PageHeader
        title="GitHub repositories"
        description={ready ? `Repositories available to @${account.username}. Import one to start a linked project.` : "Link your GitHub account to browse and import repositories."}
        actions={
          <>
            <Link href="/connect-github" className={buttonClasses("outline", "sm")}>
              {account.linked ? "Manage link" : "Connect GitHub"}
            </Link>
            {ready ? (
              <Link href="/import-project" className={buttonClasses("primary", "sm")}>
                Import by name
              </Link>
            ) : null}
          </>
        }
      />
      {ready ? (
        <GithubRepoBrowser />
      ) : (
        <div className="max-w-2xl">
          <GithubAccountCard configured={capabilities.github} account={account} next="/dashboard/github" errorCode={sp.error ?? null} />
        </div>
      )}
    </div>
  );
}
