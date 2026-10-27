"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ExternalLink, FolderGit2, RefreshCw, Unlink, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { api, ClientApiError } from "@/lib/client/api";
import { emit } from "@/lib/client/events";
import type { WorkspaceRole } from "@/lib/client/workspace/types";

type SyncStatus = {
  linked: boolean;
  repo?: string;
  branch?: string;
  url?: string;
  lastSyncAt?: string | null;
  added?: string[];
  changed?: string[];
  deleted?: string[];
  head?: { commitSha: string; treeSha: string };
  lastSync?: { commitSha: string | null; treeSha: string | null };
  aheadBy?: number;
  behindBy?: number;
  synced?: boolean;
};

type StatusResponse = {
  configured: boolean;
  missing: string[];
  account: { linked: boolean; username: string | null };
  project: { repo: string | null; branch: string | null };
  status: SyncStatus | null;
  error: { code: string; message: string } | null;
};

type PushResponse = { committed: boolean; commitSha: string; commitUrl: string | null; changed: string[]; added: string[]; deleted: string[]; repo: string; branch: string };
type PullResponse = { imported: number; skipped: { path: string; reason: string }[]; truncated: boolean; paths: string[] };

const base = (id: string) => `/api/v1/projects/${encodeURIComponent(id)}/github`;

function PathList({ title, paths, tone }: { title: string; paths: string[]; tone: "success" | "warning" | "danger" }) {
  if (!paths.length) return null;
  return (
    <details className="group rounded-md border border-border" open={paths.length <= 8}>
      <summary className="flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs font-medium">
        <span>{title}</span>
        <Badge variant={tone}>{paths.length}</Badge>
      </summary>
      <ul className="max-h-40 overflow-auto border-t border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
        {paths.map((p) => (
          <li key={p} className="truncate">
            <button type="button" className="hover:text-foreground hover:underline" onClick={() => emit("codexa:open-file", { path: p })}>
              {p}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function GithubPanel({ projectId }: { projectId: string; conversationId?: string }) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [role, setRole] = useState<WorkspaceRole>("viewer");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"push" | "pull" | "link" | "unlink" | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "danger" | "warning"; title: string; body?: string } | null>(null);
  const [pullOpen, setPullOpen] = useState(false);
  const [linkRepo, setLinkRepo] = useState("");
  const [linkBranch, setLinkBranch] = useState("");
  const canEdit = role === "owner" || role === "admin" || role === "editor";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([api<StatusResponse>(`${base(projectId)}/status`), api<{ role: WorkspaceRole }>(`/api/v1/projects/${encodeURIComponent(projectId)}`)]);
      setData(s);
      setRole(p.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load GitHub status");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // Deferred so the effect body itself does not set state synchronously (react-hooks/set-state-in-effect).
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const push = async () => {
    if (!message.trim()) return;
    setBusy("push");
    setNotice(null);
    try {
      const r = await api<PushResponse>(`${base(projectId)}/push`, { method: "POST", json: { message: message.trim() } });
      if (r.committed) {
        setNotice({ kind: "success", title: `Pushed ${r.added.length + r.changed.length + r.deleted.length} file changes to ${r.repo}@${r.branch}`, body: r.commitUrl ?? undefined });
        setMessage("");
      } else setNotice({ kind: "warning", title: "Nothing to commit", body: "Your project files match the branch." });
      await load();
    } catch (err) {
      const e = err as ClientApiError;
      setNotice({ kind: "danger", title: e.code === "non_fast_forward" ? "Branch has moved" : "Push failed", body: e.message });
    } finally {
      setBusy(null);
    }
  };

  const pull = async () => {
    setBusy("pull");
    setNotice(null);
    try {
      const r = await api<PullResponse>(`${base(projectId)}/pull`, { method: "POST", json: {} });
      setPullOpen(false);
      emit("codexa:files-changed", { paths: r.paths, source: "github" });
      setNotice({ kind: "success", title: `Pulled ${r.imported} files`, body: `${r.skipped.length ? `${r.skipped.length} files skipped. ` : ""}A "Before pull" checkpoint was saved.` });
      await load();
    } catch (err) {
      setNotice({ kind: "danger", title: "Pull failed", body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  };

  const link = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("link");
    setNotice(null);
    try {
      const r = await api<PullResponse>(`${base(projectId)}/import`, { method: "POST", json: { repo: linkRepo.trim(), branch: linkBranch.trim() || undefined } });
      emit("codexa:files-changed", { paths: r.paths, source: "github" });
      setNotice({ kind: "success", title: `Linked and imported ${r.imported} files`, body: 'Previous files were saved as the "Before pull" checkpoint.' });
      await load();
    } catch (err) {
      setNotice({ kind: "danger", title: "Could not link repository", body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  };

  const unlink = async () => {
    setBusy("unlink");
    try {
      await api(base(projectId), { method: "DELETE" });
      setNotice({ kind: "success", title: "Repository unlinked", body: "Project files were kept." });
      await load();
    } catch (err) {
      setNotice({ kind: "danger", title: "Could not unlink", body: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading GitHub status">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="p-4">
        <Alert variant="danger" title="Could not load GitHub status">
          {error}
        </Alert>
        <Button variant="outline" size="sm" className="mt-3" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }
  if (!data.configured) {
    return (
      <div className="p-4">
        <Alert variant="warning" title="GitHub is not configured on this server">
          Set {data.missing.join(" and ")} to enable GitHub import and push.
        </Alert>
      </div>
    );
  }
  if (!data.account.linked) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<FolderGit2 className="size-8" aria-hidden="true" />}
          title="Connect your GitHub account"
          description="Link GitHub to import a repository into this project and push commits."
          action={
            <Button asChild>
              <Link href={`/connect-github?next=${encodeURIComponent(`/projects/${projectId}`)}`}>Connect GitHub</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const s = data.status;
  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4" aria-label="GitHub">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Linked as <span className="font-mono">@{data.account.username}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={load} loading={loading} aria-label="Refresh status">
          <RefreshCw className="size-4" aria-hidden="true" /> Refresh
        </Button>
      </div>
      {notice ? (
        <Alert variant={notice.kind} title={notice.title}>
          {notice.body && /^https?:\/\//.test(notice.body) ? (
            <a href={notice.body} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              View commit on GitHub
            </a>
          ) : (
            notice.body
          )}
        </Alert>
      ) : null}
      {data.error ? (
        <Alert variant="danger" title="GitHub returned an error">
          {data.error.message}
        </Alert>
      ) : null}

      {!data.project.repo ? (
        <form onSubmit={link} className="space-y-3 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">Link a repository</p>
          <p className="text-xs text-muted-foreground">Replaces this project&apos;s files with the branch content (a checkpoint is saved first). To create a new project instead, use Import from GitHub.</p>
          <Field label="Repository (owner/name)" htmlFor="gh-link-repo">
            <Input id="gh-link-repo" value={linkRepo} onChange={(e) => setLinkRepo(e.target.value)} placeholder="owner/name" required disabled={!canEdit} />
          </Field>
          <Field label="Branch" htmlFor="gh-link-branch" hint="Leave empty for the default branch.">
            <Input id="gh-link-branch" value={linkBranch} onChange={(e) => setLinkBranch(e.target.value)} placeholder="main" disabled={!canEdit} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={busy === "link"} disabled={!canEdit || !linkRepo.trim()}>
              <ArrowDownToLine className="size-4" aria-hidden="true" /> Link and pull
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/import-project">Import as new project</Link>
            </Button>
          </div>
          {!canEdit ? <p className="text-xs text-muted-foreground">You need the editor role to link a repository.</p> : null}
        </form>
      ) : (
        <>
          <div className="rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-medium">{data.project.repo}</p>
                <p className="text-xs text-muted-foreground">
                  branch <span className="font-mono">{data.project.branch}</span>
                  {s?.lastSyncAt ? ` · synced ${new Date(s.lastSyncAt).toLocaleString()}` : ""}
                </p>
              </div>
              <a href={s?.url ?? `https://github.com/${data.project.repo}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Open on GitHub <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </div>
            {s ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge variant={s.aheadBy ? "primary" : "default"}>{s.aheadBy ?? 0} local change{s.aheadBy === 1 ? "" : "s"}</Badge>
                {s.behindBy && s.behindBy > 0 ? <Badge variant="warning">{s.behindBy} new commit{s.behindBy === 1 ? "" : "s"} on GitHub</Badge> : null}
                {s.behindBy === -1 ? <Badge variant="warning">upstream history unknown</Badge> : null}
                {!s.synced ? <Badge variant="outline">never pushed from Codexa</Badge> : null}
              </div>
            ) : null}
          </div>

          {s ? (
            <div className="space-y-2">
              <PathList title="Added" paths={s.added ?? []} tone="success" />
              <PathList title="Changed" paths={s.changed ?? []} tone="warning" />
              <PathList title="Deleted" paths={s.deleted ?? []} tone="danger" />
              {!s.added?.length && !s.changed?.length && !s.deleted?.length ? <p className="text-xs text-muted-foreground">No local changes compared to the last synced tree.</p> : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Field label="Commit message" htmlFor="gh-commit-message">
              <Textarea
                id="gh-commit-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your changes"
                disabled={!canEdit}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void push();
                }}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={push} loading={busy === "push"} disabled={!canEdit || !message.trim() || busy !== null}>
                <Upload className="size-4" aria-hidden="true" /> Commit &amp; push
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPullOpen(true)} disabled={!canEdit || busy !== null}>
                <ArrowDownToLine className="size-4" aria-hidden="true" /> Pull latest
              </Button>
              <Button size="sm" variant="ghost" onClick={unlink} loading={busy === "unlink"} disabled={!canEdit || busy !== null}>
                <Unlink className="size-4" aria-hidden="true" /> Unlink
              </Button>
            </div>
            {!canEdit ? <p className="text-xs text-muted-foreground">You need the editor role to push or pull.</p> : null}
            <p className="text-xs text-muted-foreground">Pushes are fast-forward only. If the branch moved on GitHub, pull first; Codexa never force-pushes.</p>
          </div>
        </>
      )}

      <Dialog open={pullOpen} onOpenChange={setPullOpen}>
        <DialogContent title="Pull latest from GitHub?" description={`All project files will be replaced with the content of ${data.project.repo}@${data.project.branch}. A checkpoint named "Before pull" is saved first so you can restore.`} className="[--btn-radius:10px]">
          <DialogFooter>
            <Button variant="outline" onClick={() => setPullOpen(false)} disabled={busy === "pull"}>
              Cancel
            </Button>
            <Button onClick={pull} loading={busy === "pull"}>
              Pull and replace files
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
