import Link from "next/link";
import { overview } from "@/lib/billing/admin-service";
import { queueStats } from "@/lib/jobs";
import { capabilities } from "@/lib/env";
import { AdminPageHeader, StatTile } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [counts, jobs] = await Promise.all([overview(), queueStats()]);
  const caps: { label: string; ok: boolean; hint: string }[] = [
    { label: "Anthropic", ok: capabilities.anthropic, hint: "ANTHROPIC_API_KEY" },
    { label: "OpenAI", ok: capabilities.openai, hint: "OPENAI_API_KEY" },
    { label: "Email (Customer.io or Resend)", ok: capabilities.email, hint: "CUSTOMERIO_APP_API_KEY or RESEND_API_KEY" },
    { label: "GitHub OAuth", ok: capabilities.github, hint: "GITHUB_CLIENT_ID/SECRET" },
    { label: "Stripe", ok: capabilities.stripe, hint: "STRIPE_SECRET_KEY" },
    { label: "Razorpay", ok: capabilities.razorpay, hint: "RAZORPAY_KEY_ID/SECRET" },
    { label: "Vercel", ok: capabilities.vercel, hint: "VERCEL_TOKEN" },
    { label: "E2B", ok: capabilities.e2b, hint: "E2B_API_KEY" },
  ];
  return (
    <div>
      <AdminPageHeader title="Overview" description="Live counts from the database. Nothing here is estimated." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Users" value={counts.users} hint="Active (not suspended)" />
        <StatTile label="Workspaces" value={counts.workspaces} />
        <StatTile label="Projects" value={counts.projects} />
        <StatTile label="AI runs today" value={counts.runsToday} hint="Since 00:00 UTC" />
        <StatTile label="Failed deployments" value={counts.failedDeployments7d} hint="Last 7 days" tone={counts.failedDeployments7d > 0 ? "warning" : "default"} />
        <StatTile label="Open support tickets" value={counts.openTickets} tone={counts.openTickets > 0 ? "warning" : "default"} />
        <StatTile label="Open abuse reports" value={counts.openAbuseReports} tone={counts.openAbuseReports > 0 ? "danger" : "default"} />
        <StatTile label="Paid subscriptions" value={counts.paidSubscriptions} hint="Active, trialing or past due" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Job queue</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {(["queued", "running", "succeeded", "failed", "cancelled"] as const).map((s) => (
                <div key={s}>
                  <dt className="text-xs capitalize text-muted-foreground">{s}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{jobs[s]}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs text-muted-foreground">Oldest due</dt>
                <dd className="text-sm">{jobs.oldestDueAt ? new Date(jobs.oldestDueAt).toLocaleString() : "none due"}</dd>
              </div>
            </dl>
            <Link href="/admin/jobs" className="mt-3 inline-block text-sm text-primary hover:underline">
              Manage jobs
            </Link>
            {jobs.queued > 0 && jobs.running === 0 ? <p className="mt-2 text-xs text-muted-foreground">Jobs are queued but none are running. They run on the Worker&apos;s 5-minute Cron Trigger; check it is enabled.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Configured providers</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {caps.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5">
                  <span>{c.label}</span>
                  <Badge variant={c.ok ? "success" : "outline"} title={c.hint}>
                    {c.ok ? "Configured" : "Not set"}
                  </Badge>
                </li>
              ))}
            </ul>
            <Link href="/admin/ai-health" className="mt-3 inline-block text-sm text-primary hover:underline">
              AI health
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
