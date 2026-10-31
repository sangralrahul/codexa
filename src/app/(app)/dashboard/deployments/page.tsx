import Link from "next/link";
import { AppPage, PageHeader } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth/guards";
import { getCurrentWorkspace } from "@/lib/services/current-workspace";
import { listProjects } from "@/lib/services/projects";
import { getRecentDeployments } from "@/lib/services/dashboard-insights";
import { deploymentLine } from "@/components/app/overview";
import { absoluteTime, relativeTime } from "@/components/projects/format";
import { Alert } from "@/components/ui/misc";

export const metadata = { title: "Deployments", robots: { index: false } };

const LIMIT = 50;
const PROVIDER: Record<string, string> = { codexa: "Codexa hosting", vercel: "Vercel" };
const STATUS: Record<string, string> = { live: "Live", failed: "Failed", building: "Building", deploying: "Uploading", queued: "Queued", rolled_back: "Previous" };

function hostOf(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

/** Every recent deployment in the current workspace (newest first), straight from the deployments table. */
export default async function DeploymentsPage() {
  const user = await requireUser("/dashboard/deployments");
  const { current } = await getCurrentWorkspace(user);
  const projects = current ? await listProjects(current.workspace.id) : [];
  const rows = await getRecentDeployments(
    projects.map((p) => p.id),
    LIMIT,
  );
  return (
    <AppPage>
      <PageHeader title="Deployments" description={current ? `Newest deployments in ${current.workspace.name} (up to ${LIMIT}). Publish and roll back from each project's editor.` : undefined} />
      {!current ? (
        <Alert variant="warning" title="No workspace">
          You are not a member of any workspace.{" "}
          <Link href="/settings/workspaces/new" className="underline">
            Create one
          </Link>{" "}
          to start building.
        </Alert>
      ) : (
        <div className="app-box overflow-hidden">
          <table className="app-table" aria-label="Deployments">
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Status</th>
                <th scope="col" className="hidden sm:table-cell">
                  Domain
                </th>
                <th scope="col" className="hidden md:table-cell">
                  Provider
                </th>
                <th scope="col" className="hidden lg:table-cell">
                  Deployment
                </th>
                <th scope="col" className="text-right sm:text-left">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <span className="block font-medium text-foreground">No deployments yet</span>
                    <span className="mt-1 block">Open a project and choose Publish to deploy it.</span>
                  </td>
                </tr>
              ) : (
                rows.map((d) => {
                  const at = (d.finishedAt ?? d.createdAt).toISOString();
                  const host = d.status === "live" || d.status === "rolled_back" ? hostOf(d.url) : null;
                  const line = deploymentLine({ id: d.id, projectId: d.projectId, projectName: d.projectName, provider: d.provider, status: d.status, at, url: d.url, host, error: d.error, canRollback: false });
                  return (
                    <tr key={d.id}>
                      <td className="font-medium text-foreground">
                        <Link href={`/projects/${d.projectId}`} className="hover:underline hover:underline-offset-4">
                          {d.projectName}
                        </Link>
                        {d.status === "failed" && d.error ? (
                          <small className="block max-w-[360px] truncate text-[12px] font-normal text-muted-foreground" title={d.error}>
                            {d.error}
                          </small>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-[7px] text-foreground">
                          <span className="app-dot" data-tone={line.tone} aria-hidden="true" />
                          {STATUS[d.status] ?? d.status}
                        </span>
                      </td>
                      <td className="mono hidden max-w-[240px] truncate sm:table-cell">
                        {host && d.url ? (
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline hover:underline-offset-4">
                            {host}
                          </a>
                        ) : (
                          <span className="app-dim">None</span>
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap md:table-cell">{PROVIDER[d.provider] ?? d.provider}</td>
                      <td className="mono hidden lg:table-cell">{d.id.replace(/-/g, "").slice(0, 7)}</td>
                      <td className="whitespace-nowrap text-right sm:text-left">
                        <time dateTime={at} title={absoluteTime(at)}>
                          {relativeTime(at)}
                        </time>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppPage>
  );
}
