import { listAbuse, type TicketStatus } from "@/lib/billing/admin-service";
import { AdminPageHeader, EmptyRow, FilterForm, Mono, Pagination, StatusBadge, Table, Td, Th, When } from "@/components/admin/table";
import { StatusSelect } from "@/components/admin/actions";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Abuse reports" };

type SP = Promise<{ status?: string; page?: string }>;

export default async function AdminAbusePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const status = (["open", "in_progress", "closed", "all"].includes(sp.status ?? "") ? sp.status : "open") as TicketStatus | "all";
  const data = await listAbuse({ status, page });
  return (
    <div>
      <AdminPageHeader title="Abuse reports" description="Reports about projects, deployments, users or showcase entries. Review the target, act (suspend user, unpublish entry) and close the report." />
      <FilterForm action="/admin/abuse" values={{ status }} fields={[{ name: "status", label: "Status", type: "select", options: [{ value: "open", label: "Open" }, { value: "in_progress", label: "In progress" }, { value: "closed", label: "Closed" }, { value: "all", label: "All" }] }]} />
      <Table caption="Abuse reports">
        <thead>
          <tr>
            <Th>Target</Th>
            <Th>Reason</Th>
            <Th>Reporter</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th>Update</Th>
          </tr>
        </thead>
        <tbody>
          {data.reports.length === 0 ? <EmptyRow colSpan={6}>No reports match.</EmptyRow> : null}
          {data.reports.map((r) => (
            <tr key={r.id}>
              <Td>
                <Badge variant="outline">{r.targetType}</Badge>
                <Mono className="ml-1 text-[10px]">{r.targetId}</Mono>
              </Td>
              <Td className="max-w-[28rem] whitespace-pre-wrap text-xs">{r.reason}</Td>
              <Td className="text-xs text-muted-foreground">{r.reporterEmail ?? (r.reporterId ? `user ${r.reporterId.slice(0, 8)}` : "anonymous")}</Td>
              <Td>
                <StatusBadge status={r.status} />
              </Td>
              <Td>
                <When value={r.createdAt} />
              </Td>
              <Td>
                <StatusSelect endpoint="abuse" id={r.id} status={r.status} label={`Status for report ${r.id}`} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/abuse" params={{ status }} />
    </div>
  );
}
