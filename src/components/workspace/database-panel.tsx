"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Database, KeyRound, Play, Plus, RefreshCw, Sparkles, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { api, ClientApiError } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { ConnectionForm, type ConnectionInfo, type ProviderInfo, type TestResult } from "@/components/integrations/connection-form";
import type { WorkspaceRole } from "@/lib/client/workspace/types";

type ColumnInfo = { name: string; type: string; nullable: boolean; default: string | null; isPrimaryKey: boolean; foreignKey: { table: string; column: string } | null };
type TableInfo = { schema: string; name: string; kind: "table" | "view"; rowEstimate: number | null; columns: ColumnInfo[]; primaryKey: string[] };
type SchemaResponse = { connection: { id: string; name: string; provider: string }; schemas: string[]; tables: TableInfo[] };
type QueryResult = { rows: Record<string, unknown>[]; fields: { name: string; dataTypeId: number }[]; rowCount: number; durationMs: number; command: string | null; truncated: boolean; readOnly: boolean };

const DB_PROVIDERS = new Set(["postgres", "supabase"]);

/**
 * Cross-panel request to the AI chat (documented in docs/INTEGRATIONS.md): the chat owner can listen for
 * `codexa:ai-ask` { text } and prefill/send the prompt. Dispatched raw because src/lib/client/events.ts
 * belongs to another owner.
 */
function askAi(text: string) {
  window.dispatchEvent(new CustomEvent("codexa:ai-ask", { detail: { text } }));
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function TableRow({ t, onInsert }: { t: TableInfo; onInsert: (sql: string) => void }) {
  const [open, setOpen] = useState(false);
  const qualified = t.schema === "public" ? `"${t.name}"` : `"${t.schema}"."${t.name}"`;
  return (
    <li>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs hover:bg-muted"
        >
          <ChevronRight className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden="true" />
          <Table2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate font-mono">{t.schema !== "public" ? `${t.schema}.` : ""}{t.name}</span>
          {t.kind === "view" ? <Badge variant="outline">view</Badge> : null}
          {t.rowEstimate !== null ? <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">~{t.rowEstimate.toLocaleString()}</span> : null}
        </button>
        <button type="button" onClick={() => onInsert(`select * from ${qualified} limit 50;`)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Query ${t.name}`} title="Insert SELECT">
          <Play className="size-3" aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <ul className="ml-6 border-l border-border pl-2 text-[11px]">
          {t.columns.map((c) => (
            <li key={c.name} className="flex items-center gap-1.5 py-0.5">
              {c.isPrimaryKey ? <KeyRound className="size-3 text-warning" aria-label="primary key" /> : <span className="size-3" aria-hidden="true" />}
              <span className="font-mono">{c.name}</span>
              <span className="text-muted-foreground">{c.type}</span>
              {!c.nullable ? <span className="text-muted-foreground">not null</span> : null}
              {c.foreignKey ? (
                <span className="text-muted-foreground" title={`references ${c.foreignKey.table}.${c.foreignKey.column}`}>
                  → {c.foreignKey.table}.{c.foreignKey.column}
                </span>
              ) : null}
            </li>
          ))}
          {!t.columns.length ? <li className="py-0.5 text-muted-foreground">No columns visible</li> : null}
        </ul>
      ) : null}
    </li>
  );
}

export function DatabasePanel({ projectId }: { projectId: string; conversationId?: string }) {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [role, setRole] = useState<WorkspaceRole>("viewer");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [connectionId, setConnectionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [lastTest, setLastTest] = useState<TestResult | null>(null);
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [sql, setSql] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ reason: string } | null>(null);
  const [tableFilter, setTableFilter] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const canEdit = role === "owner" || role === "admin" || role === "editor";
  const canManage = role === "owner" || role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const p = await api<{ project: { workspaceId: string }; role: WorkspaceRole }>(`/api/v1/projects/${encodeURIComponent(projectId)}`);
      setWorkspaceId(p.project.workspaceId);
      setRole(p.role);
      const d = await api<{ providers: ProviderInfo[]; connections: ConnectionInfo[] }>(`/api/v1/integrations?workspaceId=${encodeURIComponent(p.project.workspaceId)}`);
      setProviders(d.providers.filter((x) => DB_PROVIDERS.has(x.id)));
      const dbConns = d.connections.filter((c) => DB_PROVIDERS.has(c.provider));
      setConnections(dbConns);
      setConnectionId((cur) => (cur && dbConns.some((c) => c.id === cur) ? cur : (dbConns[0]?.id ?? "")));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load database connections");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const loadSchema = useCallback(
    async (cid: string) => {
      if (!cid) {
        setSchema(null);
        return;
      }
      setSchemaLoading(true);
      setSchemaError(null);
      try {
        setSchema(await api<SchemaResponse>(`/api/v1/projects/${encodeURIComponent(projectId)}/database/schema?connectionId=${encodeURIComponent(cid)}`));
      } catch (err) {
        setSchema(null);
        setSchemaError(err instanceof Error ? err.message : "Could not inspect the schema");
      } finally {
        setSchemaLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    const t = setTimeout(() => void loadSchema(connectionId), 0);
    return () => clearTimeout(t);
  }, [connectionId, loadSchema]);

  const run = useCallback(
    async (confirmDestructive = false) => {
      if (!connectionId || !sql.trim() || running) return;
      setRunning(true);
      setQueryError(null);
      setConfirm(null);
      try {
        const r = await api<QueryResult>(`/api/v1/projects/${encodeURIComponent(projectId)}/database/query`, { method: "POST", json: { connectionId, sql, confirmDestructive } });
        setResult(r);
        if (!r.readOnly) void loadSchema(connectionId);
      } catch (err) {
        if (err instanceof ClientApiError && err.code === "confirmation_required") {
          const d = err.details as { reason?: string } | undefined;
          setConfirm({ reason: d?.reason ?? err.message });
        } else {
          setResult(null);
          setQueryError(err instanceof Error ? err.message : "Query failed");
        }
      } finally {
        setRunning(false);
      }
    },
    [connectionId, sql, running, projectId, loadSchema],
  );

  const filteredTables = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!schema) return [];
    return q ? schema.tables.filter((t) => `${t.schema}.${t.name}`.toLowerCase().includes(q)) : schema.tables;
  }, [schema, tableFilter]);

  const insertSql = (text: string) => {
    setSql(text);
    editorRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading database panel">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (loadError || !workspaceId) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Could not load connections">
          {loadError}
        </Alert>
        <Button variant="outline" size="sm" className="mt-3" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  const addDialog = (
    <Dialog open={adding} onOpenChange={setAdding}>
      <DialogContent title="Add database connection" description="Connection strings are encrypted at rest and never shown again. The connection is shared with the whole workspace." className="[--btn-radius:10px]">
        <ConnectionForm
          workspaceId={workspaceId}
          providers={providers}
          onCancel={() => setAdding(false)}
          onCreated={(c, t) => {
            setConnections((list) => [c, ...list]);
            setConnectionId(c.id);
            setLastTest(t);
            setAdding(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );

  if (!connections.length) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<Database className="size-8" aria-hidden="true" />}
          title="No database connections"
          description={canManage ? "Connect a PostgreSQL or Supabase database to browse its schema and run queries." : "Ask a workspace admin to add a PostgreSQL or Supabase connection."}
          action={
            canManage ? (
              <Button onClick={() => setAdding(true)}>
                <Plus className="size-4" aria-hidden="true" /> Add connection
              </Button>
            ) : undefined
          }
        />
        {addDialog}
      </div>
    );
  }

  const current = connections.find((c) => c.id === connectionId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col" aria-label="Database">
      <div className="flex flex-wrap items-end gap-2 border-b border-border p-3">
        <div className="min-w-[10rem] flex-1">
          <Label htmlFor="db-connection" className="mb-1 block text-xs">
            Connection
          </Label>
          <Select id="db-connection" value={connectionId} onChange={(e) => setConnectionId(e.target.value)} className="h-9">
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.provider})
              </option>
            ))}
          </Select>
        </div>
        {canManage ? (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" /> Add
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => loadSchema(connectionId)} loading={schemaLoading} aria-label="Refresh schema">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>
      {lastTest ? (
        <div className="px-3 pt-3">
          <Alert variant={lastTest.ok ? "success" : "danger"} title={lastTest.ok ? "Connection works" : "Connection test failed"}>
            {lastTest.message}
          </Alert>
        </div>
      ) : null}
      {current?.status === "error" && current.lastError && !lastTest ? (
        <div className="px-3 pt-3">
          <Alert variant="warning" title="Last connection test failed">
            {current.lastError}
          </Alert>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-0 md:grid-cols-[220px_minmax(0,1fr)] md:grid-rows-1">
        <section aria-label="Schema" className="flex min-h-0 max-h-56 flex-col border-b border-border md:max-h-none md:border-b-0 md:border-r">
          <div className="p-2">
            <label htmlFor="db-table-filter" className="sr-only">
              Filter tables
            </label>
            <input
              id="db-table-filter"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              placeholder="Filter tables"
              className="h-8 w-full rounded-md border border-border bg-input px-2 text-xs focus-visible:outline-2 focus-visible:outline-ring/40"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
            {schemaLoading && !schema ? (
              <div className="space-y-1.5" aria-busy="true">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ) : schemaError ? (
              <Alert variant="danger" title="Schema unavailable">
                {schemaError}
              </Alert>
            ) : schema && !filteredTables.length ? (
              <p className="px-1 text-xs text-muted-foreground">{schema.tables.length ? "No tables match." : "No tables in this database."}</p>
            ) : (
              <ul className="space-y-0.5">
                {filteredTables.map((t) => (
                  <TableRow key={`${t.schema}.${t.name}`} t={t} onInsert={insertSql} />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section aria-label="SQL" className="flex min-h-0 flex-col">
          <div className="border-b border-border p-2">
            <label htmlFor="db-sql" className="sr-only">
              SQL query
            </label>
            <Textarea
              id="db-sql"
              ref={editorRef}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  void run(false);
                }
              }}
              rows={5}
              spellCheck={false}
              placeholder={canEdit ? "select now();" : "You need the editor role to run queries."}
              disabled={!canEdit}
              className="min-h-24 resize-y font-mono text-xs"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => run(false)} loading={running} disabled={!canEdit || !sql.trim() || !connectionId}>
                <Play className="size-4" aria-hidden="true" /> Run
              </Button>
              <span className="text-[11px] text-muted-foreground">Ctrl/Cmd+Enter · max 500 rows · reads run in a read-only transaction</span>
              <button
                type="button"
                onClick={() => askAi(`Write a SQL query for the connected PostgreSQL database${schema ? ` (tables: ${schema.tables.slice(0, 30).map((t) => t.name).join(", ")})` : ""}: `)}
                className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <Sparkles className="size-3" aria-hidden="true" /> Generate SQL with AI in the chat
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {queryError ? (
              <div className="space-y-2">
                <Alert variant="danger" title="Query failed">
                  <pre className="whitespace-pre-wrap font-mono text-xs">{queryError}</pre>
                </Alert>
                <Button size="sm" variant="outline" onClick={() => askAi(`Explain this PostgreSQL error and how to fix it.\n\nQuery:\n${sql}\n\nError:\n${queryError}`)}>
                  <Sparkles className="size-4" aria-hidden="true" /> Explain this error
                </Button>
              </div>
            ) : result ? (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground" role="status">
                  {result.command ?? "OK"} · {result.rowCount} row{result.rowCount === 1 ? "" : "s"}
                  {result.truncated ? " (showing first 500)" : ""} · {result.durationMs} ms{result.readOnly ? " · read-only" : ""}
                </p>
                {result.fields.length ? (
                  <div className="overflow-auto rounded-md border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/60">
                        <tr>
                          {result.fields.map((f, i) => (
                            <th key={`${f.name}-${i}`} scope="col" className="whitespace-nowrap px-2 py-1 font-mono font-medium">
                              {f.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, ri) => (
                          <tr key={ri} className="border-t border-border">
                            {result.fields.map((f, i) => (
                              <td key={`${f.name}-${i}`} className="max-w-[20rem] truncate whitespace-nowrap px-2 py-1 font-mono" title={cell(row[f.name])}>
                                {row[f.name] === null ? <span className="text-muted-foreground">null</span> : cell(row[f.name])}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {!result.rows.length ? (
                          <tr>
                            <td colSpan={result.fields.length} className="px-2 py-3 text-center text-muted-foreground">
                              No rows
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Statement executed; no result set.</p>
                )}
              </div>
            ) : (
              <p className="p-2 text-xs text-muted-foreground">Results appear here. Click the play icon next to a table to insert a SELECT.</p>
            )}
          </div>
        </section>
      </div>

      <Dialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent title="Run destructive SQL?" description="This statement can delete or alter data irreversibly. It runs inside a transaction but cannot be undone once committed." className="[--btn-radius:10px]">
          <Alert variant="warning" title="Why this needs confirmation">
            {confirm?.reason}
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => run(true)} loading={running}>
              Run anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {addDialog}
    </div>
  );
}
