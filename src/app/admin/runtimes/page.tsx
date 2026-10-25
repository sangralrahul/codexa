import { activeRuntimes } from "@/lib/billing/admin-service";
import { AdminPageHeader, EmptyRow, Mono, StatusBadge, Table, Td, Th, When } from "@/components/admin/table";

export const metadata = { title: "Runtimes" };

export default async function AdminRuntimesPage() {
  const rows = await activeRuntimes();
  return (
    <div>
      <AdminPageHeader title="Runtimes" description={`${rows.length} active preview sandbox${rows.length === 1 ? "" : "es"} (status starting or running). Sandboxes are owned by the runner service; this view is read-only.`} />
      <Table caption="Active runtime sessions">
        <thead>
          <tr>
            <Th>Project</Th>
            <Th>Status</Th>
            <Th>Runner session</Th>
            <Th>Preview</Th>
            <Th>Started</Th>
            <Th>Last heartbeat</Th>
            <Th>Error</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <EmptyRow colSpan={7}>No active runtimes.</EmptyRow> : null}
          {rows.map(({ session: s, projectName, workspaceId }) => (
            <tr key={s.id}>
              <Td>
                <p className="font-medium">{projectName ?? "(deleted)"}</p>
                <p className="text-[10px] text-muted-foreground">ws {workspaceId?.slice(0, 8)}</p>
              </Td>
              <Td>
                <StatusBadge status={s.status} />
              </Td>
              <Td>
                <Mono className="text-[10px]">{s.runnerSessionId ?? "—"}</Mono>
              </Td>
              <Td className="max-w-[16rem] truncate text-xs text-muted-foreground" title={s.previewUrl ?? undefined}>
                {s.previewUrl ?? "—"}
              </Td>
              <Td>
                <When value={s.startedAt} />
              </Td>
              <Td>
                <When value={s.lastHeartbeatAt} />
              </Td>
              <Td className="text-xs text-danger">{s.error ?? ""}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
