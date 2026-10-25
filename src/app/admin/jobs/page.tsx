import { JOB_KINDS, listJobs, queueStats } from "@/lib/jobs";
import { AdminPageHeader, EmptyRow, FilterForm, Mono, Pagination, StatTile, StatusBadge, Table, Td, Th, When } from "@/components/admin/table";
import { RetryAllFailedButton, RetryJobButton } from "@/components/admin/actions";
import { Alert } from "@/components/ui/misc";

export const metadata = { title: "Jobs" };

type SP = Promise<{ status?: string; kind?: string; page?: string }>;
const PAGE = 25;
const STATUSES = ["all", "queued", "running", "succeeded", "failed", "cancelled"] as const;

export default async function AdminJobsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof STATUSES)[number]) : "all";
  const [list, stats, fetchedAt] = await Promise.all([listJobs({ status, kind: sp.kind, limit: PAGE, offset: (page - 1) * PAGE }), queueStats(), Promise.resolve(new Date())]);
  const due = stats.oldestDueAt ? fetchedAt.getTime() - new Date(stats.oldestDueAt).getTime() : 0;
  return (
    <div>
      <AdminPageHeader title="Jobs" description="Queue in the D1 jobs table, processed every 5 minutes by the Worker's Cron Trigger. Failed jobs can be re-queued here." actions={<RetryAllFailedButton count={stats.failed} />} />
      {due > 2 * 60_000 ? (
        <Alert variant="warning" title="Jobs are overdue" className="mb-4">
          The oldest due job has waited {Math.round(due / 60_000)} minutes. Check that the Worker&apos;s Cron Trigger is enabled (wrangler.jsonc → triggers).
        </Alert>
      ) : null}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Queued" value={stats.queued} />
        <StatTile label="Running" value={stats.running} />
        <StatTile label="Succeeded" value={stats.succeeded} />
        <StatTile label="Failed" value={stats.failed} tone={stats.failed > 0 ? "danger" : "default"} />
        <StatTile label="Cancelled" value={stats.cancelled} />
      </div>
      <FilterForm
        action="/admin/jobs"
        values={{ status: sp.status, kind: sp.kind }}
        fields={[
          { name: "status", label: "Status", type: "select", options: STATUSES.map((s) => ({ value: s, label: s })) },
          { name: "kind", label: "Kind", type: "select", options: [{ value: "", label: "Any" }, ...JOB_KINDS.map((k) => ({ value: k, label: k }))] },
        ]}
      />
      <Table caption="Jobs">
        <thead>
          <tr>
            <Th>Kind</Th>
            <Th>Status</Th>
            <Th>Attempts</Th>
            <Th>Run at</Th>
            <Th>Locked by</Th>
            <Th>Result / error</Th>
            <Th>Updated</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {list.jobs.length === 0 ? <EmptyRow colSpan={8}>No jobs match.</EmptyRow> : null}
          {list.jobs.map((j) => (
            <tr key={j.id}>
              <Td>
                <p className="font-medium">{j.kind}</p>
                <Mono className="text-[10px]">{j.id.slice(0, 8)}</Mono>
              </Td>
              <Td>
                <StatusBadge status={j.status} />
              </Td>
              <Td className="tabular-nums">
                {j.attempts} / {j.maxAttempts}
              </Td>
              <Td>
                <When value={j.runAt} />
              </Td>
              <Td className="text-xs text-muted-foreground">{j.lockedBy ?? "—"}</Td>
              <Td className="max-w-[24rem] text-xs">
                {j.lastError ? <span className="text-danger">{j.lastError.slice(0, 200)}</span> : j.result ? <Mono className="block whitespace-pre-wrap break-all text-[10px]">{JSON.stringify(j.result).slice(0, 200)}</Mono> : "—"}
              </Td>
              <Td>
                <When value={j.updatedAt} />
              </Td>
              <Td>{j.status === "failed" || j.status === "cancelled" ? <RetryJobButton id={j.id} /> : null}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={page} pageSize={PAGE} total={list.total} basePath="/admin/jobs" params={{ status: sp.status, kind: sp.kind }} />
    </div>
  );
}
