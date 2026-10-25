import { recentDeployments } from "@/lib/billing/admin-service";
import { AdminPageHeader, EmptyRow, FilterForm, Mono, Pagination, StatusBadge, Table, Td, Th, When } from "@/components/admin/table";

export const metadata = { title: "Deployments" };

type SP = Promise<{ status?: string; page?: string }>;

export default async function AdminDeploymentsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const status = sp.status ?? "failed";
  const data = await recentDeployments({ status, page });
  return (
    <div>
      <AdminPageHeader title="Deployments" description="Recent deployments with the tail of their build log. Defaults to failures." />
      <FilterForm
        action="/admin/deployments"
        values={{ status }}
        fields={[{ name: "status", label: "Status", type: "select", options: ["failed", "all", "queued", "building", "deploying", "live", "rolled_back"].map((s) => ({ value: s, label: s })) }]}
      />
      <Table caption="Deployments">
        <thead>
          <tr>
            <Th>Project</Th>
            <Th>Provider</Th>
            <Th>Status</Th>
            <Th>URL</Th>
            <Th>Created</Th>
            <Th>Build log (tail)</Th>
          </tr>
        </thead>
        <tbody>
          {data.deployments.length === 0 ? <EmptyRow colSpan={6}>No deployments match.</EmptyRow> : null}
          {data.deployments.map((d) => (
            <tr key={d.id}>
              <Td>
                <p className="font-medium">{d.projectName ?? "(deleted)"}</p>
                <Mono className="text-[10px]">{d.id.slice(0, 8)}</Mono>
              </Td>
              <Td className="capitalize">{d.provider}</Td>
              <Td>
                <StatusBadge status={d.status} />
                {d.error ? <p className="mt-1 max-w-[14rem] text-xs text-danger">{d.error}</p> : null}
              </Td>
              <Td className="max-w-[14rem] truncate text-xs" title={d.url ?? undefined}>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {d.url}
                  </a>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                <When value={d.createdAt} />
              </Td>
              <Td>
                {d.buildLog ? (
                  <details>
                    <summary className="cursor-pointer text-xs text-primary">Show log</summary>
                    <pre className="mt-2 max-h-64 max-w-[32rem] overflow-auto rounded-md bg-code-bg p-2 font-mono text-[11px] text-code-fg">{d.buildLog}</pre>
                  </details>
                ) : (
                  <span className="text-xs text-muted-foreground">empty</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/deployments" params={{ status }} />
    </div>
  );
}
