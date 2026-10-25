import { listSubscriptionsAdmin } from "@/lib/billing/admin-service";
import { formatPrice } from "@/config/plans";
import { AdminPageHeader, EmptyRow, FilterForm, Mono, Pagination, StatusBadge, Table, Td, Th, When } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Subscriptions" };

type SP = Promise<{ status?: string; page?: string }>;

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const data = await listSubscriptionsAdmin({ status: sp.status, page });
  return (
    <div>
      <AdminPageHeader title="Subscriptions" description="Every subscription row, including manual overrides. Provider rows are updated by webhooks." />
      <FilterForm
        action="/admin/subscriptions"
        values={{ status: sp.status }}
        fields={[{ name: "status", label: "Status", type: "select", options: [{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "trialing", label: "Trialing" }, { value: "past_due", label: "Past due" }, { value: "canceled", label: "Canceled" }, { value: "incomplete", label: "Incomplete" }] }]}
      />
      <Table caption="Subscriptions">
        <thead>
          <tr>
            <Th>Workspace</Th>
            <Th>Plan</Th>
            <Th>Status</Th>
            <Th>Provider</Th>
            <Th>Amount</Th>
            <Th>Period</Th>
            <Th>Cancel</Th>
            <Th>Updated</Th>
          </tr>
        </thead>
        <tbody>
          {data.subscriptions.length === 0 ? <EmptyRow colSpan={8}>No subscriptions yet.</EmptyRow> : null}
          {data.subscriptions.map((s) => (
            <tr key={s.id}>
              <Td>
                <p className="font-medium">{s.workspaceName ?? "(deleted)"}</p>
                <p className="text-xs text-muted-foreground">{s.workspaceSlug}</p>
              </Td>
              <Td>
                <Badge variant="primary" className="capitalize">
                  {s.plan}
                </Badge>
              </Td>
              <Td>
                <StatusBadge status={s.status} />
              </Td>
              <Td>
                <p className="capitalize">{s.provider}</p>
                {s.providerSubscriptionId ? <Mono className="text-[10px]">{s.providerSubscriptionId}</Mono> : null}
              </Td>
              <Td className="tabular-nums">
                {formatPrice(s.amountMinor, s.currency)} / {s.interval}
              </Td>
              <Td className="text-xs">
                <When value={s.currentPeriodStart} /> → <When value={s.currentPeriodEnd} />
              </Td>
              <Td>{s.cancelAtPeriodEnd ? <Badge variant="warning">At period end</Badge> : s.canceledAt ? <When value={s.canceledAt} /> : "—"}</Td>
              <Td>
                <When value={s.updatedAt} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/subscriptions" params={{ status: sp.status }} />
    </div>
  );
}
