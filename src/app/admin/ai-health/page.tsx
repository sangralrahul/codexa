import { aiHealth } from "@/lib/billing/admin-service";
import { AdminPageHeader, EmptyRow, Mono, StatTile, StatusBadge, Table, Td, Th, When } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/misc";

export const metadata = { title: "AI health" };

export default async function AdminAiHealthPage() {
  const h = await aiHealth();
  const total24 = Object.values(h.last24h).reduce((a, b) => a + b, 0);
  return (
    <div>
      <AdminPageHeader title="AI health" description={`Default provider: ${h.defaults.provider} · model: ${h.defaults.model}`} />
      {!h.capabilities.ai ? (
        <Alert variant="warning" title="No AI provider configured" className="mb-4">
          Generation runs cannot start until ANTHROPIC_API_KEY or OPENAI_API_KEY is set. The agent UI shows a “not configured” state.
        </Alert>
      ) : null}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Runs (24h)" value={total24} />
        <StatTile label="Succeeded (24h)" value={h.last24h.succeeded ?? 0} />
        <StatTile label="Failed (24h)" value={h.last24h.failed ?? 0} tone={(h.last24h.failed ?? 0) > 0 ? "warning" : "default"} />
        <StatTile label="Running now" value={h.last24h.running ?? 0} />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(h.capabilities).map(([k, v]) => (
          <Badge key={k} variant={v ? "success" : "outline"}>
            {k}: {v ? "on" : "off"}
          </Badge>
        ))}
      </div>
      <Table caption="Last 20 generation runs">
        <thead>
          <tr>
            <Th>Run</Th>
            <Th>Status</Th>
            <Th>Stage</Th>
            <Th>Provider / model</Th>
            <Th>Tokens</Th>
            <Th>Repairs</Th>
            <Th>Duration</Th>
            <Th>Started</Th>
            <Th>Error</Th>
          </tr>
        </thead>
        <tbody>
          {h.runs.length === 0 ? <EmptyRow colSpan={9}>No generation runs recorded yet.</EmptyRow> : null}
          {h.runs.map((r) => (
            <tr key={r.id}>
              <Td>
                <Mono className="text-[10px]">{r.id.slice(0, 8)}</Mono>
                <p className="text-[10px] text-muted-foreground">project {r.projectId.slice(0, 8)}</p>
              </Td>
              <Td>
                <StatusBadge status={r.status} />
              </Td>
              <Td className="text-xs">{r.stage}</Td>
              <Td className="text-xs">
                {r.provider ?? "—"} {r.model ? <span className="text-muted-foreground">/ {r.model}</span> : null}
              </Td>
              <Td className="text-xs tabular-nums">
                {r.tokensIn.toLocaleString()} in / {r.tokensOut.toLocaleString()} out
              </Td>
              <Td className="tabular-nums">{r.repairAttempts}</Td>
              <Td className="tabular-nums">{r.durationMs !== null ? `${(r.durationMs / 1000).toFixed(1)}s` : "—"}</Td>
              <Td>
                <When value={r.startedAt ?? r.createdAt} />
              </Td>
              <Td className="max-w-[20rem] text-xs text-danger" title={r.error ?? undefined}>
                <span className="line-clamp-2">{r.error ?? ""}</span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
