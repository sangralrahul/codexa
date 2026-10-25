import { listTickets, type TicketStatus } from "@/lib/billing/admin-service";
import { AdminPageHeader, EmptyRow, FilterForm, Pagination, StatusBadge, Table, Td, Th, When } from "@/components/admin/table";
import { StatusSelect } from "@/components/admin/actions";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Support" };

type SP = Promise<{ status?: string; kind?: string; page?: string }>;
const KINDS = ["support", "bug", "feature", "feedback", "sales", "demo", "contact", "disclosure"];

export default async function AdminSupportPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const status = (["open", "in_progress", "closed", "all"].includes(sp.status ?? "") ? sp.status : "open") as TicketStatus | "all";
  const data = await listTickets({ status, kind: sp.kind || undefined, page });
  return (
    <div>
      <AdminPageHeader title="Support" description="Tickets created by the public forms (support, bug, feature, feedback, sales, demo, contact, disclosure). Replies are sent by email from your mailbox; this view tracks status." />
      <FilterForm
        action="/admin/support"
        values={{ status, kind: sp.kind }}
        fields={[
          { name: "status", label: "Status", type: "select", options: [{ value: "open", label: "Open" }, { value: "in_progress", label: "In progress" }, { value: "closed", label: "Closed" }, { value: "all", label: "All" }] },
          { name: "kind", label: "Kind", type: "select", options: [{ value: "", label: "Any" }, ...KINDS.map((k) => ({ value: k, label: k }))] },
        ]}
      />
      <Table caption="Support tickets">
        <thead>
          <tr>
            <Th>Ticket</Th>
            <Th>From</Th>
            <Th>Kind</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th>Update</Th>
          </tr>
        </thead>
        <tbody>
          {data.tickets.length === 0 ? <EmptyRow colSpan={6}>No tickets match.</EmptyRow> : null}
          {data.tickets.map((t) => (
            <tr key={t.id}>
              <Td className="max-w-[28rem]">
                <p className="font-medium">{t.subject}</p>
                <details>
                  <summary className="cursor-pointer text-xs text-primary">Message</summary>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{t.body}</p>
                  {Object.keys(t.metadata).length ? <pre className="mt-1 overflow-auto rounded bg-muted p-2 text-[10px]">{JSON.stringify(t.metadata, null, 2)}</pre> : null}
                </details>
              </Td>
              <Td className="text-xs">
                <p>{t.name || "—"}</p>
                <a href={`mailto:${t.email}?subject=${encodeURIComponent(`Re: ${t.subject}`)}`} className="text-primary hover:underline">
                  {t.email}
                </a>
              </Td>
              <Td>
                <Badge variant="outline">{t.kind}</Badge>
              </Td>
              <Td>
                <StatusBadge status={t.status} />
              </Td>
              <Td>
                <When value={t.createdAt} />
              </Td>
              <Td>
                <StatusSelect endpoint="support" id={t.id} status={t.status} label={`Status for ticket ${t.subject}`} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/support" params={{ status, kind: sp.kind }} />
    </div>
  );
}
