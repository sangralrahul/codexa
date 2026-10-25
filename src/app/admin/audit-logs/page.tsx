import { listAuditLogs } from "@/lib/billing/admin-service";
import { AdminPageHeader, EmptyRow, FilterForm, Mono, Pagination, Table, Td, Th, When } from "@/components/admin/table";

export const metadata = { title: "Audit logs" };

type SP = Promise<{ action?: string; workspaceId?: string; actorId?: string; page?: string }>;

export default async function AdminAuditLogsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const data = await listAuditLogs({ action: sp.action, workspaceId: sp.workspaceId, actorId: sp.actorId, page });
  return (
    <div>
      <AdminPageHeader title="Audit logs" description="Security-relevant actions: team changes, billing, account changes and admin actions. Filter by action prefix (e.g. billing., team., admin.)." />
      <FilterForm
        action="/admin/audit-logs"
        values={{ action: sp.action, workspaceId: sp.workspaceId, actorId: sp.actorId }}
        fields={[
          { name: "action", label: "Action prefix", placeholder: "billing." },
          { name: "workspaceId", label: "Workspace id" },
          { name: "actorId", label: "Actor id" },
        ]}
      />
      <Table caption="Audit log entries">
        <thead>
          <tr>
            <Th>When</Th>
            <Th>Action</Th>
            <Th>Actor</Th>
            <Th>Workspace</Th>
            <Th>Target</Th>
            <Th>Metadata</Th>
            <Th>IP</Th>
          </tr>
        </thead>
        <tbody>
          {data.logs.length === 0 ? <EmptyRow colSpan={7}>No entries match.</EmptyRow> : null}
          {data.logs.map((l) => (
            <tr key={l.id}>
              <Td className="whitespace-nowrap">
                <When value={l.createdAt} />
              </Td>
              <Td>
                <Mono>{l.action}</Mono>
              </Td>
              <Td className="text-xs">{l.actorEmail ?? (l.actorId ? l.actorId.slice(0, 8) : "system")}</Td>
              <Td>
                <Mono className="text-[10px]">{l.workspaceId?.slice(0, 8) ?? "—"}</Mono>
              </Td>
              <Td className="text-xs">
                {l.targetType ?? "—"} {l.targetId ? <Mono className="text-[10px]">{l.targetId.slice(0, 12)}</Mono> : null}
              </Td>
              <Td className="max-w-[20rem]">
                <Mono className="block whitespace-pre-wrap break-all text-[10px]">{JSON.stringify(l.metadata)}</Mono>
              </Td>
              <Td className="text-xs text-muted-foreground">{l.ip ?? "—"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/audit-logs" params={{ action: sp.action, workspaceId: sp.workspaceId, actorId: sp.actorId }} />
    </div>
  );
}
