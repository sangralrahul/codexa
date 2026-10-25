import Link from "next/link";
import { ArrowRight, CreditCard, Gauge, Plug, Settings2, ShieldCheck, UserRound, Users } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getEffectivePlan } from "@/lib/services/usage";
import { PLANS } from "@/config/plans";
import { PageHeader } from "@/components/app/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";

export const metadata = pageMetadata({ title: "Settings", description: "Manage your account and workspace settings.", path: "/settings", noindex: true });

const ACCOUNT = [
  { href: "/settings/profile", title: "Profile", description: "Name, time zone, language and avatar.", icon: UserRound },
  { href: "/settings/security", title: "Security", description: "Password, active sessions, data export and account deletion.", icon: ShieldCheck },
];
const WORKSPACE = [
  { href: "/settings/workspace", title: "General", description: "Workspace name, URL slug and billing currency.", icon: Settings2 },
  { href: "/settings/members", title: "Members", description: "Invite teammates, change roles and manage invitations.", icon: Users },
  { href: "/settings/billing", title: "Billing", description: "Plan, invoices, upgrades and cancellation.", icon: CreditCard },
  { href: "/settings/usage", title: "Usage", description: "AI requests, runtime minutes, deployments and storage this period.", icon: Gauge },
  { href: "/settings/integrations", title: "Integrations", description: "Workspace-level connections to third-party services.", icon: Plug },
];

function LinkCard({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: typeof UserRound }) {
  return (
    <Link href={href} className="group block rounded-xl focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2">
      <Card className="h-full transition hover:border-border-strong hover:shadow-md">
        <CardHeader className="flex flex-row items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              {title}
              <ArrowRight className="size-3.5 text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden="true" />
            </CardTitle>
            <CardDescription className="mt-1 text-xs">{description}</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}

export default async function SettingsIndexPage() {
  const user = await requireUser("/settings");
  const { current } = await getCurrentWorkspace(user);
  const plan = current ? await getEffectivePlan(current.workspace) : null;
  return (
    <div>
      <PageHeader title="Settings" description={`Signed in as ${user.email}`} />
      <section aria-labelledby="account-heading" className="mb-8">
        <h2 id="account-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Account
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ACCOUNT.map((c) => (
            <LinkCard key={c.href} {...c} />
          ))}
        </div>
      </section>
      <section aria-labelledby="workspace-heading">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 id="workspace-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Workspace
          </h2>
          {current ? (
            <>
              <span className="text-sm font-medium">{current.workspace.name}</span>
              <Badge variant="primary">{PLANS[plan ?? "free"].name}</Badge>
              <Badge variant="outline" className="capitalize">
                {current.role}
              </Badge>
            </>
          ) : null}
        </div>
        {current ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {WORKSPACE.map((c) => (
              <LinkCard key={c.href} {...c} />
            ))}
          </div>
        ) : (
          <Alert variant="info" title="No workspace selected">
            <Link href="/settings/workspaces/new" className="underline">
              Create a workspace
            </Link>{" "}
            to manage members, billing and integrations.
          </Alert>
        )}
        <CardContent className="px-0 pt-4">
          <Link href="/settings/workspaces/new" className="text-sm font-medium text-primary hover:underline">
            Create another workspace
          </Link>
        </CardContent>
      </section>
    </div>
  );
}
