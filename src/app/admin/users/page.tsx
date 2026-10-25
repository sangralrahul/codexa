import { requireAdmin } from "@/lib/auth/guards";
import { listUsers } from "@/lib/billing/admin-service";
import { AdminPageHeader, EmptyRow, FilterForm, Mono, Pagination, Table, Td, Th, When } from "@/components/admin/table";
import { UserActions } from "@/components/admin/actions";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Users" };

type SP = Promise<{ q?: string; role?: string; page?: string }>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SP }) {
  const actor = await requireAdmin();
  const sp = await searchParams;
  const role = sp.role === "user" || sp.role === "staff" || sp.role === "admin" ? sp.role : undefined;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const data = await listUsers({ q: sp.q, role, page });
  return (
    <div>
      <AdminPageHeader title="Users" description="Search by email or name. Role changes require the admin role; suspending signs the user out everywhere." />
      <FilterForm
        action="/admin/users"
        values={{ q: sp.q, role: sp.role }}
        fields={[
          { name: "q", label: "Search", placeholder: "email or name" },
          { name: "role", label: "Role", type: "select", options: [{ value: "", label: "Any" }, { value: "user", label: "user" }, { value: "staff", label: "staff" }, { value: "admin", label: "admin" }] },
        ]}
      />
      <Table caption="Users">
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Role</Th>
            <Th>Verified</Th>
            <Th>Joined</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {data.users.length === 0 ? <EmptyRow colSpan={6}>No users match.</EmptyRow> : null}
          {data.users.map((u) => (
            <tr key={u.id}>
              <Td>
                <p className="font-medium">{u.name || "—"}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
                <Mono className="text-[10px]">{u.id}</Mono>
              </Td>
              <Td>
                <Badge variant={u.role === "admin" ? "danger" : u.role === "staff" ? "warning" : "default"}>{u.role}</Badge>
              </Td>
              <Td>{u.emailVerifiedAt ? "Yes" : "No"}</Td>
              <Td>
                <When value={u.createdAt} />
              </Td>
              <Td>{u.deletedAt ? <Badge variant="danger">Suspended / deleted</Badge> : <Badge variant="success">Active</Badge>}</Td>
              <Td>
                <UserActions user={{ id: u.id, email: u.email, role: u.role, deletedAt: u.deletedAt?.toISOString() ?? null }} actorRole={actor.role} isSelf={u.id === actor.id} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} basePath="/admin/users" params={{ q: sp.q, role: sp.role }} />
    </div>
  );
}
