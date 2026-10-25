import { listFlags } from "@/lib/billing/admin-service";
import { AdminPageHeader, EmptyRow, Mono, Table, Td, Th, When } from "@/components/admin/table";
import { FlagRowActions, NewFlagForm } from "@/components/admin/actions";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Feature flags" };

export default async function AdminFeatureFlagsPage() {
  const flags = await listFlags();
  return (
    <div>
      <AdminPageHeader title="Feature flags" description="Boolean flags read by code through isFlagEnabled(key) in src/lib/billing/flags.ts (cached for 15s per process). Unknown flags are disabled." />
      <div className="mb-6">
        <NewFlagForm />
      </div>
      <Table caption="Feature flags">
        <thead>
          <tr>
            <Th>Key</Th>
            <Th>State</Th>
            <Th>Description</Th>
            <Th>Rules</Th>
            <Th>Updated</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {flags.length === 0 ? <EmptyRow colSpan={6}>No flags defined. Create one above.</EmptyRow> : null}
          {flags.map((f) => (
            <tr key={f.key}>
              <Td>
                <Mono>{f.key}</Mono>
              </Td>
              <Td>
                <Badge variant={f.enabled ? "success" : "outline"}>{f.enabled ? "Enabled" : "Disabled"}</Badge>
              </Td>
              <Td className="max-w-[20rem] text-xs text-muted-foreground">{f.description || "—"}</Td>
              <Td>
                <Mono className="text-[10px]">{Object.keys(f.rules).length ? JSON.stringify(f.rules) : "{}"}</Mono>
              </Td>
              <Td>
                <When value={f.updatedAt} />
              </Td>
              <Td>
                <FlagRowActions flag={{ key: f.key, enabled: f.enabled }} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
