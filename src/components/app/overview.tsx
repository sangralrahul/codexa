import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PromptBox } from "@/components/projects/prompt-box";
import type { ProjectCardItem } from "@/components/projects/project-card";
import type { DeploymentRow } from "@/components/projects/deployments-card";
import type { KpiEntitlements } from "@/components/projects/kpi-row";
import { GettingStarted, type ChecklistMilestones } from "@/components/projects/getting-started";
import { absoluteTime, frameworkLabel, lastTouch, relativeTime } from "@/components/projects/format";
import { ProjectThumb } from "./project-thumb";
import { shortAgo, UsageBar } from "./grid-bits";

export type OverviewMember = { id: string; name: string; avatarUrl: string | null; role: string };
type Tone = "ok" | "warn" | "error" | "info" | undefined;

/** A project's state for the table, from its database status only (never inferred). */
export function projectState(p: ProjectCardItem): { label: string; tone: Tone } {
  const s = p.status;
  if (s?.deploy === "building") return { label: "Building", tone: "warn" };
  if (s?.live) return { label: "Live", tone: "ok" };
  if (s?.deploy === "failed") return { label: "Failed", tone: "error" };
  if (s?.preview) return { label: "Preview running", tone: "info" };
  return { label: "Draft", tone: undefined };
}

/** A deployment row's dot and one-line summary. */
export function deploymentLine(d: DeploymentRow): { tone: Tone; text: string } {
  switch (d.status) {
    case "live":
      return { tone: "ok", text: d.host ? `Production · ${d.host}` : "Production" };
    case "failed":
      return { tone: "error", text: d.error ? `Failed · ${d.error}` : "Failed" };
    case "building":
      return { tone: "warn", text: "Building" };
    case "deploying":
      return { tone: "warn", text: "Uploading" };
    case "queued":
      return { tone: "warn", text: "Queued" };
    case "rolled_back":
      return { tone: undefined, text: d.host ? `Previous version · ${d.host}` : "Previous version" };
    default:
      return { tone: undefined, text: d.status };
  }
}

function resetLabel(periodStart: Date) {
  const d = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** The d01 projects table: thumbnail + name + files, runtime, status dot, domain, checkpoint, updated. */
export function ProjectsTable({ projects, label, empty }: { projects: ProjectCardItem[]; label: string; empty?: React.ReactNode }) {
  return (
    <div className="app-box overflow-x-auto">
      <table className="app-table" aria-label={label}>
        <thead>
          <tr>
            <th scope="col">Project</th>
            <th scope="col" className="hidden md:table-cell">
              Runtime
            </th>
            <th scope="col">Status</th>
            <th scope="col" className="hidden sm:table-cell">
              Domain
            </th>
            <th scope="col" className="hidden lg:table-cell">
              Checkpoint
            </th>
            <th scope="col" className="text-right sm:text-left">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center">
                {empty ?? "No projects yet."}
              </td>
            </tr>
          ) : (
            projects.map((p) => {
              const st = projectState(p);
              const touch = lastTouch(p);
              return (
                <tr key={p.id}>
                  <td className="w-full max-w-0 font-medium text-foreground sm:w-auto sm:max-w-none">
                    <Link href={`/projects/${p.id}`} className="group/pr flex min-w-0 items-center gap-3 rounded-[4px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                      <ProjectThumb templateId={p.templateId} framework={p.framework} size="lg" className="hidden h-10 w-16 rounded-[4px] shadow-[inset_0_0_0_1px_var(--border-strong)] min-[420px]:inline-flex" />
                      <span className="min-w-0">
                        <span className="block truncate group-hover/pr:underline group-hover/pr:underline-offset-4">{p.name}</span>
                        <small className="app-dim app-mono block whitespace-nowrap text-[11px] font-normal">
                          {p.fileCount ?? 0} file{p.fileCount === 1 ? "" : "s"}
                        </small>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden whitespace-nowrap md:table-cell">{frameworkLabel(p.framework)}</td>
                  <td className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-[7px] text-foreground">
                      <span className="app-dot" data-tone={st.tone} aria-hidden="true" />
                      {st.label}
                    </span>
                  </td>
                  <td className="mono hidden max-w-[220px] truncate sm:table-cell">
                    {p.status?.live ? (
                      <a href={p.status.live.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline hover:underline-offset-4" title={`Open ${p.status.live.url}`}>
                        {p.status.live.host}
                      </a>
                    ) : (
                      <span className="app-dim">Not published</span>
                    )}
                  </td>
                  <td className="mono hidden whitespace-nowrap lg:table-cell">
                    {p.lastCheckpointId ? (
                      <span title={`${p.checkpointCount ?? 1} checkpoint${p.checkpointCount === 1 ? "" : "s"} · latest ${absoluteTime(p.lastCheckpointAt)}`}>{p.lastCheckpointId.replace(/-/g, "").slice(0, 7)}</span>
                    ) : (
                      <span className="app-dim">None</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-right sm:text-left">
                    <time dateTime={touch.iso} title={`${touch.label} · ${absoluteTime(touch.iso)}`} suppressHydrationWarning>
                      {relativeTime(touch.iso)}
                    </time>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Overview (the signed-in dashboard), d01 "Monochrome Grid": the composer and the projects table
 * in the main column; usage, recent deployments and members in a 320px aside. Every value comes
 * from the page's database reads and the plan config.
 */
export function Overview({
  composer,
  showPresets,
  projects,
  projectCount,
  deployments,
  entitlements,
  members,
  memberLimit,
  canCreate,
  checklist,
}: {
  composer: React.ComponentProps<typeof PromptBox>;
  /** Quick-start presets under the composer (first run only, to keep the page quiet afterwards). */
  showPresets: boolean;
  /** Most recently touched first. */
  projects: ProjectCardItem[];
  projectCount: number;
  deployments: DeploymentRow[];
  entitlements: KpiEntitlements | null;
  members: OverviewMember[];
  /** Plan seat limit (-1 = unlimited); null without a workspace. */
  memberLimit: number | null;
  canCreate: boolean;
  checklist: { milestones: ChecklistMilestones; emailVerified: boolean; emailConfigured: boolean } | null;
}) {
  const e = entitlements;
  const shownMembers = members.slice(0, 5);
  return (
    <div className="mx-auto grid w-full max-w-[1296px] grid-cols-1 gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <h1 className="sr-only">Overview</h1>
      <div className="min-w-0">
        <PromptBox {...composer} presets={showPresets ? composer.presets : []} align="start" compact />

        {checklist ? (
          <GettingStarted
            milestones={checklist.milestones}
            canCreate={canCreate}
            emailVerified={checklist.emailVerified}
            emailConfigured={checklist.emailConfigured}
            resumeHref={projects[0] ? `/projects/${projects[0].id}` : undefined}
            layout="strip"
            className="mt-4"
          />
        ) : null}

        <section aria-labelledby="ov-projects" className="mt-7">
          <div className="mb-3 flex items-center gap-2.5">
            <h2 id="ov-projects" className="text-[16px] font-semibold tracking-[-0.01em]">
              Projects
            </h2>
            <span className="app-pill app-mono">{projectCount}</span>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/projects" className="app-chip">
                All projects
              </Link>
              {canCreate ? (
                <Link href="/new-project" className="app-chip">
                  <Plus className="size-3.5" aria-hidden="true" /> New project
                </Link>
              ) : null}
            </div>
          </div>
          <ProjectsTable
            projects={projects}
            label="Recent projects"
            empty={
              <>
                <span className="block font-medium text-foreground">No projects yet</span>
                <span className="mt-1 block">
                  Describe your first app above, start from a{" "}
                  <Link href="/dashboard/templates" className="text-foreground underline underline-offset-4">
                    template
                  </Link>
                  {canCreate ? (
                    <>
                      , or{" "}
                      <Link href="/import-project" className="text-foreground underline underline-offset-4">
                        import from GitHub
                      </Link>
                    </>
                  ) : null}
                  .
                </span>
              </>
            }
          />
          {projectCount > projects.length ? (
            <p className="mt-3 text-[13px] text-muted-foreground">
              Showing the {projects.length} most recent of {projectCount}.{" "}
              <Link href="/projects" className="text-foreground underline-offset-4 hover:underline">
                View all projects
              </Link>
            </p>
          ) : null}
        </section>
      </div>

      <aside aria-label="Workspace summary" className="flex min-w-0 flex-col gap-5">
        <section className="app-box" aria-labelledby="ov-usage">
          <div className="app-box__head">
            <h2 id="ov-usage">
              <Link href="/settings/usage">Usage</Link>
            </h2>
            {e ? <span>Resets {resetLabel(e.periodStart)}</span> : null}
          </div>
          {e ? (
            <div className="space-y-3.5 px-3.5 py-3">
              <UsageBar label="AI requests" used={e.used.ai_request} limit={e.limits.aiRequestsPerMonth} metered />
              <UsageBar label="Preview minutes" used={e.used.runtime_minutes} limit={e.limits.runtimeMinutesPerMonth} metered />
              <UsageBar label="Projects" used={projectCount} limit={e.limits.projects} metered />
              <UsageBar label="Deployments" used={e.used.deployment} limit={e.limits.deploymentsPerMonth} metered />
            </div>
          ) : (
            <p className="px-3.5 py-3 text-[13px] text-muted-foreground">No workspace selected.</p>
          )}
        </section>

        <section className="app-box" aria-labelledby="ov-deploys">
          <div className="app-box__head">
            <h2 id="ov-deploys">Recent deployments</h2>
            <Link href="/dashboard/deployments">View all</Link>
          </div>
          {deployments.length ? (
            <ol className="app-feed px-3.5">
              {deployments.map((d) => {
                const line = deploymentLine(d);
                return (
                  <li key={d.id}>
                    <span className="app-dot" data-tone={line.tone} aria-hidden="true" />
                    <span className="min-w-0">
                      <Link href={`/projects/${d.projectId}`} className="block truncate font-medium text-foreground hover:underline hover:underline-offset-4">
                        {d.projectName}
                      </Link>
                      <span className="block truncate" title={line.text}>
                        {line.text}
                      </span>
                    </span>
                    <time dateTime={d.at} title={absoluteTime(d.at)} suppressHydrationWarning>
                      {shortAgo(d.at)}
                    </time>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="px-3.5 py-3 text-[13px] text-muted-foreground">No deployments yet. Publish a project from the editor and it shows up here.</p>
          )}
        </section>

        <section className="app-box" aria-labelledby="ov-members">
          <div className="app-box__head">
            <h2 id="ov-members">
              <Link href="/settings/members">Members</Link>
            </h2>
            {memberLimit !== null ? (
              <span className="app-mono">{memberLimit < 0 ? `${members.length} seats` : `${members.length} of ${memberLimit} seats`}</span>
            ) : null}
          </div>
          {shownMembers.length ? (
            <ul className="app-feed px-3.5">
              {shownMembers.map((m) => (
                <li key={m.id} className="!grid-cols-[22px_minmax(0,1fr)_auto] items-center">
                  <Avatar name={m.name} src={m.avatarUrl} size="xs" className="[&>span]:size-[22px]" />
                  <span className="truncate font-medium text-foreground">{m.name}</span>
                  <span className="app-meta uppercase">{m.role}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3.5 py-3 text-[13px] text-muted-foreground">No members.</p>
          )}
          <div className="border-t border-border px-3.5 py-2.5 text-[13px]">
            <Link href={members.length > shownMembers.length ? "/settings/members" : "/settings/members#invite"} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              {members.length > shownMembers.length ? `View all ${members.length} members` : "Invite members"}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </aside>
    </div>
  );
}
