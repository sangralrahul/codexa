import Link from "next/link";
import { listWorkspacesAdmin } from "@/lib/billing/admin-service";
import { AdminPageHeader, EmptyRow, FilterForm, Mono, Pagination, Table, Td, Th, When } from "@/components/admin/table";
import { PlanOverrideDialog } from "@/components/admin/actions";
import { Badge } from "@/components/ui/badge";
import type { Plan } from "@/db/schema";

export const metadata = { title: "Workspaces" };

type SP = Promise<{ q?: string; plan?: string; page?: string }>;
const PLANS = new Set(["free", "pro", "team", "enterprise"]);

export default async function AdminWorkspacesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const data = await listWorkspacesAdmin({ q: sp.q, plan: sp.plan && PLANS.has(sp.plan) ? (sp.plan as Plan) : undefined, page });
  return (
    <div>
      <AdminPageHeader title="Workspaces" description="Stored plan, members and project counts. Use “Override plan” to assign a plan without a payment provider." />
      <FilterForm
        action="/admin/workspaces"
        values={{ q: sp.q, plan: sp.plan }}
        fields={[
          { name: "q", label: "Search", placeholder: "name or slug" },
          { name: "plan", label: "Plan", type: "select", options: [{ value: "", label: "Any" }, { value: "free", label: "Free" }, { value: "pro", label: "Pro" }, { value: "team", label: "Team" }, { value: "enterprise", label: "Enterprise" }] },
        ]}
      />
      <Table caption="Workspaces">
        <thead>
          <tr>
            <Th>Workspace</Th>
            <Th>Owner</Th>
            <Th>Plan</Th>
            <Th>Currency</Th>
            <Th>Members</Th>
            <Th>Projects</Th>
            <Th>Created</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {data.workspaces.length === 0 ? <EmptyRow colSpan={8}>No workspaces match.</EmptyRow> : null}
          {data.workspaces.map((w) => (
            <tr key={w.id}>
              <Td>
                <p className="font-medium">{w.name}</p>
                <p className="text-xs text-muted-foreground">{w.slug}</p>
                <Mono className="text-[10px]">{w.id}</Mono>
              </Td>
              <Td className="text-xs text-muted-foreground">{w.ownerEmail ?? "—"}</Td>
              <Td>
                <Badge variant={w.plan === "free" ? "default" : "primary"} className="capitalize">
                  {w.plan}
                </Badge>
              </Td>
              <Td>{w.billingCurrency}</Td>
              <Td className="tabular-nums">{w.members}</Td>
              <Td className="tabular-nums">{w.projects}</Td>
              <Td>
                <When value={w.createdAt} />
              </Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <PlanOverrideDialog workspace={{ id: w.id, name: w.name, plan: w.plan }} />
                  <Link href={`/admin/audit-logs?workspaceId=${w.id}`} className="text-xs text-primary hover:underline">
                    Audit
                  </Link>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/workspaces" params={{ q: sp.q, plan: sp.plan }} />
    </div>
  );
}
