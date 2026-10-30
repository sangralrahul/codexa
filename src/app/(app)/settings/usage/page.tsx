import Link from "next/link";
import { Activity, CalendarClock, FolderKanban, Users } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { getWorkspaceEntitlements } from "@/lib/services/usage";
import { getUsageHistory } from "@/lib/services/usage-history";
import { countProjects } from "@/lib/services/projects";
import { getTeam } from "@/lib/billing/team-service";
import { PLANS } from "@/config/plans";
import { PageHeader } from "@/components/app/app-shell";
import { NoWorkspace } from "@/components/settings/no-workspace";
import { SettingsCard } from "@/components/settings/section";
import { UsageMeters } from "@/components/settings/usage-meters";
import { UsageHistogram } from "@/components/settings/usage-history";
import { UsageBreakdown } from "@/components/settings/usage-breakdown";
import { periodInfo } from "@/components/settings/usage-model";

export const metadata = pageMetadata({ title: "Usage", description: "AI requests, runtime minutes, deployments and storage used this period.", path: "/settings/usage", noindex: true });

export default async function UsageSettingsPage() {
  const user = await requireUser("/settings/usage");
  const { current } = await getCurrentWorkspace(user);
  if (!current) {
    return <NoWorkspace title="Usage" what="its usage" />;
  }
  const ws = current.workspace;
  const [entitlements, projects, team, history] = await Promise.all([getWorkspaceEntitlements(ws), countProjects(ws.id), getTeam(ws.id), getUsageHistory(user, ws.id)]);
  const pending = team.invites.filter((i) => !i.expired).length;
  const period = periodInfo(entitlements.periodStart);
  const resets = period.resetsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const pct = Math.round((period.day / period.days) * 100);
  return (
    <div className="settings-stack space-y-6">
      <PageHeader
        eyebrow={`Workspace · ${ws.name}`}
        title="Usage"
        description={`What ${ws.name} has used this billing period, from real events: AI runs, preview sessions and deployments. Limits are enforced on the server.`}
      />
      <SettingsCard
        id="period"
        icon={<CalendarClock />}
        title={
          <span className="flex flex-wrap items-baseline gap-x-2">
            This period <span className="font-normal text-muted-foreground">· {period.label}</span>
          </span>
        }
        description={`${PLANS[entitlements.plan].name} plan. Usage resets on the 1st of each month (UTC).`}
        hint={
          <>
            How each metric is counted:{" "}
            <Link href="/usage" className="underline underline-offset-2 hover:text-foreground">
              usage explained
            </Link>
            .
          </>
        }
      >
        <div className="mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
            <p>
              <span className="font-medium">
                Day {period.day} of {period.days}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · resets {resets} ({period.daysLeft === 1 ? "tomorrow" : `in ${period.daysLeft} days`})
              </span>
            </p>
            <p className="font-mono text-xs tabular-nums text-foreground-dim">{pct}% of the period elapsed</p>
          </div>
          <div
            role="progressbar"
            aria-label="Billing period elapsed"
            aria-valuemin={1}
            aria-valuemax={period.days}
            aria-valuenow={period.day}
            aria-valuetext={`Day ${period.day} of ${period.days}`}
            className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted shadow-[inset_0_0_0_1px_var(--border)]"
          >
            <span className="period-fill absolute inset-y-0 left-0 rounded-full bg-[image:var(--brand-gradient)]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <UsageMeters entitlements={entitlements} counts={{ projects, members: team.members.length, pending }} />
      </SettingsCard>

      <SettingsCard id="activity" icon={<Activity />} title="Daily activity" description="One bar per UTC day of this period, straight from recorded usage events. Today is lit.">
        <UsageHistogram days={history.days} periodDays={period.days} totals={history.totals} />
      </SettingsCard>

      {/* Side by side once the column has room for two readable tables (a container query: the settings nav and app
          sidebar make the column much narrower than the viewport). */}
      <section id="breakdown" aria-label="Breakdown" className="settings-plain @container scroll-mt-24">
        <div className="grid gap-5 @min-[44rem]:grid-cols-2">
        <SettingsCard id="breakdown-projects" icon={<FolderKanban />} title="Top projects" description="This period, by AI requests." flush>
          <UsageBreakdown kind="projects" rows={history.projects} />
        </SettingsCard>
        <SettingsCard id="breakdown-members" icon={<Users />} title="By member" description="Who used metered features this period." flush>
          <UsageBreakdown kind="members" rows={history.members} />
        </SettingsCard>
        </div>
      </section>
    </div>
  );
}
