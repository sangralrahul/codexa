"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Cloud, Copy, Database, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/client/api";
import { emit } from "@/lib/client/events";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";

type Access = "private" | "public_read" | "public";
type CollectionInfo = { name: string; access: Access; records: number; createdAt: string };
type Status = {
  enabled: boolean;
  canEdit: boolean;
  apiBase: string;
  sdkPath: string;
  snippet: string;
  counts: { users: number; records: number; collections: number };
  limits: { maxRecordBytes: number; maxRecordsPerProject: number };
  collections: CollectionInfo[];
};
type RecordRow = Record<string, unknown> & { id: string; ownerId: string | null; createdAt: string; updatedAt: string };
type AppUserRow = { id: string; email: string; name: string; createdAt: string; lastSignInAt: string | null };

const ACCESS_LABEL: Record<Access, string> = { private: "Private", public_read: "Public read", public: "Public" };
const ACCESS_HINT: Record<Access, string> = {
  private: "Signed-in users see and change only their own records.",
  public_read: "Anyone reads; signed-in users add and edit their own.",
  public: "Anyone reads and adds; only the creator edits.",
};
const NAME_RE = /^[a-z][a-z0-9_]{0,39}$/;

const errMsg = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Never");

function dataOf(r: RecordRow) {
  const { id: _id, ownerId: _o, createdAt: _c, updatedAt: _u, ...rest } = r;
  void _id;
  void _o;
  void _c;
  void _u;
  return rest;
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error("Could not copy", "Select the text and copy it manually.");
  }
}

export function CloudPanel({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const base = `/api/v1/projects/${encodeURIComponent(projectId)}/cloud`;
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setStatus(await api<Status>(base));
    } catch (err) {
      setLoadError(errMsg(err, "Could not load Cloud"));
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const enable = async () => {
    setEnabling(true);
    setEnableError(null);
    try {
      const s = await api<Status>(base, { method: "POST" });
      setStatus(s);
      emit("codexa:files-changed", { paths: [s.sdkPath], source: "editor" });
      toast.success("Cloud is on", `Added ${s.sdkPath}. Ask the AI to save data or add sign-in.`);
    } catch (err) {
      setEnableError(errMsg(err, "Could not turn on Cloud"));
    } finally {
      setEnabling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading Cloud">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (loadError || !status) {
    return (
      <div className="p-4">
        <Alert
          variant="danger"
          title="Could not load Cloud"
          action={
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          }
        >
          {loadError}
        </Alert>
      </div>
    );
  }

  const editable = canEdit && status.canEdit;

  if (!status.enabled) {
    const hasData = status.counts.records > 0 || status.counts.users > 0;
    return (
      <div className="space-y-3 p-4">
        <EmptyState
          icon={<Cloud aria-hidden="true" />}
          title="Give this app a database and sign-in"
          description={
            <>
              Store data and let people sign up with email and password, with no setup or API keys. Turning it on adds <code className="font-mono text-xs">{status.sdkPath}</code> and teaches the AI to use it.
              {hasData ? ` Data from before (${status.counts.records} records, ${status.counts.users} users) is still here.` : null}
            </>
          }
          action={
            editable ? (
              <Button onClick={() => void enable()} loading={enabling}>
                <Cloud className="size-4" aria-hidden="true" /> Turn on Cloud
              </Button>
            ) : undefined
          }
        />
        {!editable ? <p className="text-center text-sm text-muted-foreground">Only editors can turn on Cloud for this project.</p> : null}
        {enableError ? <Alert variant="danger" title="Could not turn on Cloud">{enableError}</Alert> : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <Badge variant="success">On</Badge>
        <span className="text-muted-foreground">
          {status.counts.collections} collection{status.counts.collections === 1 ? "" : "s"} · {status.counts.records.toLocaleString()} record{status.counts.records === 1 ? "" : "s"} ·{" "}
          {status.counts.users.toLocaleString()} user{status.counts.users === 1 ? "" : "s"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => {
            setVersion((v) => v + 1);
            void load();
          }}
          aria-label="Refresh Cloud"
        >
          <RefreshCw className="size-4" aria-hidden="true" /> Refresh
        </Button>
      </div>
      <Tabs defaultValue="data" className="flex min-h-0 flex-1 flex-col">
        <TabsList aria-label="Cloud sections" className="self-start">
          <TabsTrigger value="data">
            <Database aria-hidden="true" /> Data
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users aria-hidden="true" /> Users
          </TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>
        <TabsContent value="data" className="min-h-0 flex-1">
          <DataTab key={`d${version}`} base={base} status={status} editable={editable} onChanged={() => void load()} />
        </TabsContent>
        <TabsContent value="users" className="min-h-0 flex-1">
          <UsersTab key={`u${version}`} base={base} editable={editable} onChanged={() => void load()} />
        </TabsContent>
        <TabsContent value="setup" className="min-h-0 flex-1">
          <SetupTab base={base} status={status} editable={editable} onDisabled={() => void load()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

function DataTab({ base, status, editable, onChanged }: { base: string; status: Status; editable: boolean; onChanged: () => void }) {
  const [selected, setSelected] = useState<string | null>(status.collections[0]?.name ?? null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newAccess, setNewAccess] = useState<Access>("private");
  const [creating, setCreating] = useState(false);
  const current = status.collections.find((c) => c.name === selected) ?? status.collections[0] ?? null;

  const setAccess = async (name: string, access: Access) => {
    setSaving(name);
    setError(null);
    try {
      await api(`${base}/collections/${encodeURIComponent(name)}`, { method: "PATCH", json: { access } });
      toast.success(`${name} is now ${ACCESS_LABEL[access].toLowerCase()}`);
      onChanged();
    } catch (err) {
      setError(errMsg(err, "Could not change access"));
    } finally {
      setSaving(null);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!NAME_RE.test(name)) {
      setError("Collection names start with a lowercase letter and use only a-z, 0-9 and _ (max 40).");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await api(`${base}/collections/${encodeURIComponent(name)}`, { method: "PATCH", json: { access: newAccess } });
      setNewName("");
      setSelected(name);
      onChanged();
    } catch (err) {
      setError(errMsg(err, "Could not create the collection"));
    } finally {
      setCreating(false);
    }
  };

  const createForm = editable ? (
    <form onSubmit={create} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[8rem] flex-1">
        <Label htmlFor="cloud-new-collection" className="mb-1 block text-xs">
          New collection
        </Label>
        <Input id="cloud-new-collection" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. posts" className="h-9 font-mono" maxLength={40} autoComplete="off" />
      </div>
      <div>
        <Label htmlFor="cloud-new-access" className="sr-only">
          Access for the new collection
        </Label>
        <Select id="cloud-new-access" value={newAccess} onChange={(e) => setNewAccess(e.target.value as Access)} className="h-9 w-[8.5rem]">
          {(Object.keys(ACCESS_LABEL) as Access[]).map((a) => (
            <option key={a} value={a}>
              {ACCESS_LABEL[a]}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" size="sm" variant="outline" className="h-9" loading={creating} disabled={!newName.trim()}>
        <Plus className="size-4" aria-hidden="true" /> Add
      </Button>
    </form>
  ) : null;

  if (!status.collections.length) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={<Database aria-hidden="true" />}
          title="No data yet"
          description="Collections appear here when your app saves its first record. To let visitors post without signing in, create the collection here first and make it Public."
        />
        {createForm}
        {error ? <Alert variant="danger">{error}</Alert> : null}
      </div>
    );
  }

  return (
    <div className="grid min-h-0 gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="space-y-3">
        <ul className="space-y-1" aria-label="Collections">
          {status.collections.map((c) => {
            const active = current?.name === c.name;
            return (
              <li key={c.name} className={cn("rounded-lg border p-2", active ? "border-border-strong bg-muted" : "border-border")}>
                <button
                  type="button"
                  onClick={() => setSelected(c.name)}
                  aria-current={active ? "true" : undefined}
                  className="flex w-full items-center gap-2 rounded text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="truncate font-mono">{c.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{c.records.toLocaleString()}</span>
                </button>
                <div className="mt-1.5">
                  <Label htmlFor={`cloud-access-${c.name}`} className="sr-only">
                    Access for {c.name}
                  </Label>
                  {editable ? (
                    <Select
                      id={`cloud-access-${c.name}`}
                      value={c.access}
                      disabled={saving === c.name}
                      onChange={(e) => void setAccess(c.name, e.target.value as Access)}
                      className="h-8 text-xs"
                      title={ACCESS_HINT[c.access]}
                    >
                      {(Object.keys(ACCESS_LABEL) as Access[]).map((a) => (
                        <option key={a} value={a}>
                          {ACCESS_LABEL[a]}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Badge variant="outline">{ACCESS_LABEL[c.access]}</Badge>
                  )}
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{ACCESS_HINT[c.access]}</p>
                </div>
              </li>
            );
          })}
        </ul>
        {createForm}
        {error ? <Alert variant="danger">{error}</Alert> : null}
      </div>
      {current ? <RecordsTable key={current.name} base={base} collection={current.name} editable={editable} onChanged={onChanged} /> : null}
    </div>
  );
}

function RecordsTable({ base, collection, editable, onChanged }: { base: string; collection: string; editable: boolean; onChanged: () => void }) {
  const url = `${base}/collections/${encodeURIComponent(collection)}`;
  const [rows, setRows] = useState<RecordRow[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<RecordRow | null>(null);

  const fetchPage = useCallback(
    async (after: string | null) => {
      setError(null);
      try {
        const r = await api<{ items: RecordRow[]; nextCursor: string | null }>(`${url}?limit=50${after ? `&cursor=${encodeURIComponent(after)}` : ""}`);
        setRows((prev) => (after && prev ? [...prev, ...r.items] : r.items));
        setCursor(r.nextCursor);
      } catch (err) {
        setError(errMsg(err, "Could not load records"));
        setRows((prev) => prev ?? []);
      }
    },
    [url],
  );

  useEffect(() => {
    const t = setTimeout(() => void fetchPage(null), 0);
    return () => clearTimeout(t);
  }, [fetchPage]);

  return (
    <section aria-label={`Records in ${collection}`} className="min-w-0">
      {error ? (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}
      {rows === null ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading records">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState title="No records" description={`Nothing in ${collection} yet.`} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Data
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Owner
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Created
                </th>
                {editable ? (
                  <th scope="col" className="w-10 px-2 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const json = JSON.stringify(dataOf(r));
                const open = expanded === r.id;
                return (
                  <tr key={r.id} className="border-b border-border align-top last:border-0">
                    <td className="max-w-0 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : r.id)}
                        aria-expanded={open}
                        className="block w-full truncate rounded text-left font-mono text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-focus"
                        title={open ? "Collapse" : "Show full record"}
                      >
                        {json}
                      </button>
                      {open ? (
                        <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-2 font-mono text-[11px] leading-relaxed">{JSON.stringify({ id: r.id, ...dataOf(r), updatedAt: r.updatedAt }, null, 2)}</pre>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-muted-foreground" title={r.ownerId ?? "Anonymous"}>
                      {r.ownerId ? r.ownerId.slice(0, 8) : "anonymous"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmtDate(r.createdAt)}</td>
                    {editable ? (
                      <td className="px-2 py-1.5">
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => setConfirm(r)} aria-label={`Delete record ${r.id}`}>
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {cursor ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          loading={more}
          onClick={async () => {
            setMore(true);
            await fetchPage(cursor);
            setMore(false);
          }}
        >
          Load more
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete this record?"
        description="It is removed from the app's database right away. This cannot be undone."
        confirmLabel="Delete record"
        destructive
        onConfirm={async () => {
          if (!confirm) return;
          await api(`${url}/records/${encodeURIComponent(confirm.id)}`, { method: "DELETE" });
          setRows((prev) => prev?.filter((x) => x.id !== confirm.id) ?? null);
          onChanged();
        }}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

function UsersTab({ base, editable, onChanged }: { base: string; editable: boolean; onChanged: () => void }) {
  const [rows, setRows] = useState<AppUserRow[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [confirm, setConfirm] = useState<AppUserRow | null>(null);

  const fetchPage = useCallback(
    async (after: string | null) => {
      setError(null);
      try {
        const r = await api<{ users: AppUserRow[]; nextCursor: string | null }>(`${base}/users?limit=50${after ? `&cursor=${encodeURIComponent(after)}` : ""}`);
        setRows((prev) => (after && prev ? [...prev, ...r.users] : r.users));
        setCursor(r.nextCursor);
      } catch (err) {
        setError(errMsg(err, "Could not load users"));
        setRows((prev) => prev ?? []);
      }
    },
    [base],
  );

  useEffect(() => {
    const t = setTimeout(() => void fetchPage(null), 0);
    return () => clearTimeout(t);
  }, [fetchPage]);

  return (
    <section aria-label="App users">
      {error ? (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}
      {rows === null ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading users">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : !rows.length ? (
        <EmptyState icon={<Users aria-hidden="true" />} title="No users yet" description="People who sign up in your app appear here. These are your app's users, separate from your Codexa team." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Email
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Name
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Signed up
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Last sign-in
                </th>
                {editable ? (
                  <th scope="col" className="w-10 px-2 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="max-w-[16rem] truncate px-3 py-2 text-foreground" title={u.email}>
                    {u.email}
                  </td>
                  <td className="max-w-[10rem] truncate px-3 py-2 text-muted-foreground">{u.name || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmtDate(u.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{fmtDate(u.lastSignInAt)}</td>
                  {editable ? (
                    <td className="px-2 py-1.5">
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => setConfirm(u)} aria-label={`Delete user ${u.email}`}>
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cursor ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          loading={more}
          onClick={async () => {
            setMore(true);
            await fetchPage(cursor);
            setMore(false);
          }}
        >
          Load more
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Delete ${confirm?.email ?? "this user"}?`}
        description="Their account, sessions and every record they created are deleted. They are signed out everywhere. This cannot be undone."
        confirmLabel="Delete user"
        destructive
        onConfirm={async () => {
          if (!confirm) return;
          await api(`${base}/users/${encodeURIComponent(confirm.id)}`, { method: "DELETE" });
          setRows((prev) => prev?.filter((x) => x.id !== confirm.id) ?? null);
          onChanged();
        }}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function SetupTab({ base, status, editable, onDisabled }: { base: string; status: Status; editable: boolean; onDisabled: () => void }) {
  const [confirmOff, setConfirmOff] = useState(false);
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="cloud-api-base" className="mb-1 block text-xs">
          API base URL
        </Label>
        <div className="flex gap-2">
          <Input id="cloud-api-base" readOnly value={status.apiBase} className="h-9 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={() => void copy(status.apiBase, "API URL")}>
            <Copy className="size-4" aria-hidden="true" /> Copy
          </Button>
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-2">
          <p className="text-xs font-medium">
            Client in <code className="font-mono">{status.sdkPath}</code>
          </p>
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => void copy(status.snippet, "Snippet")}>
            <Copy className="size-3.5" aria-hidden="true" /> Copy
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-3 font-mono text-[11px] leading-relaxed">{status.snippet}</pre>
        <p className="mt-2 text-xs text-muted-foreground">
          The AI already knows this API. No keys are needed: who can read and write is set per collection on the Data tab. Limits: {Math.round(status.limits.maxRecordBytes / 1024)} KB per record,{" "}
          {status.limits.maxRecordsPerProject.toLocaleString()} records per app.
        </p>
      </div>
      {editable ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">Turning Cloud off stops the app&apos;s data and sign-in API. Data and users are kept.</p>
          <Button variant="outline" size="sm" onClick={() => setConfirmOff(true)}>
            Turn off Cloud
          </Button>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title="Turn off Cloud?"
        description="Your app will no longer be able to load or save data or sign people in. Data and users are kept, and turning Cloud back on restores them."
        confirmLabel="Turn off"
        destructive
        onConfirm={async () => {
          await api(base, { method: "DELETE" });
          toast.success("Cloud is off", "Data and users are kept.");
          onDisabled();
        }}
      />
    </div>
  );
}
