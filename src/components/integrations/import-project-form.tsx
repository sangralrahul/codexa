"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import { api, ClientApiError } from "@/lib/client/api";
import { RepoList, type RepoItem } from "./repo-list";

type Branch = { name: string; sha: string; protected: boolean };
type ImportResult = { project: { id: string; name: string }; imported: number; skipped: { path: string; reason: string }[]; truncated: boolean; templateId: string };

export function ImportProjectForm({
  workspaces,
  defaultWorkspaceId,
  initialRepo,
}: {
  workspaces: { id: string; name: string; role: string }[];
  defaultWorkspaceId: string | null;
  initialRepo?: string | null;
}) {
  const router = useRouter();
  const [repo, setRepo] = useState<RepoItem | null>(null);
  const [repoName, setRepoName] = useState(initialRepo ?? "");
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [branch, setBranch] = useState("");
  const [branchError, setBranchError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState(defaultWorkspaceId ?? workspaces[0]?.id ?? "");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    const full = repoName.trim();
    const valid = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(full);
    let cancelled = false;
    const t = setTimeout(() => {
      setBranches(null);
      setBranchError(null);
    }, 0);
    if (!valid) return () => clearTimeout(t);
    api<{ branches: Branch[]; defaultBranch: string }>(`/api/v1/integrations/github/branches?repo=${encodeURIComponent(full)}`)
      .then((d) => {
        if (cancelled) return;
        setBranches(d.branches);
        setBranch((b) => (b && d.branches.some((x) => x.name === b) ? b : d.defaultBranch));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setBranches([]);
        setBranchError(err instanceof Error ? err.message : "Could not load branches");
      });
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [repoName]);

  const select = (r: RepoItem) => {
    setRepo(r);
    setRepoName(r.fullName);
    setBranch(r.defaultBranch);
    if (!name) setName(r.name);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const data = await api<ImportResult>("/api/v1/integrations/github/import", {
        method: "POST",
        json: { workspaceId, repo: repoName.trim(), branch: branch || undefined, name: name.trim() || undefined },
      });
      setResult(data);
      router.push(`/projects/${data.project.id}`);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setFieldErrors(err.fieldErrors());
        setError(err.message);
      } else setError(err instanceof Error ? err.message : "Import failed");
      setBusy(false);
    }
  };

  const canSubmit = Boolean(workspaceId) && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoName.trim()) && !busy;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section aria-labelledby="pick-repo">
        <h2 id="pick-repo" className="mb-3 text-base font-semibold">
          1. Pick a repository
        </h2>
        <RepoList onSelect={select} selectedId={repo?.id ?? null} actionLabel="Select" />
      </section>
      <form onSubmit={submit} className="h-fit space-y-4 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-20" aria-labelledby="import-settings">
        <h2 id="import-settings" className="text-base font-semibold">
          2. Import settings
        </h2>
        {error ? (
          <Alert variant="danger" title="Import failed">
            {error}
          </Alert>
        ) : null}
        <Field label="Repository (owner/name)" htmlFor="import-repo" error={fieldErrors.repo} hint="Select from the list or type any repository you can access.">
          <Input id="import-repo" value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="owner/name" autoComplete="off" aria-invalid={Boolean(fieldErrors.repo) || undefined} />
        </Field>
        <Field label="Branch" htmlFor="import-branch" error={fieldErrors.branch ?? branchError} hint={branches === null && repoName ? "Loading branches…" : undefined}>
          {branches && branches.length ? (
            <Select id="import-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
              {branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                  {b.protected ? " (protected)" : ""}
                </option>
              ))}
            </Select>
          ) : (
            <Input id="import-branch" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" autoComplete="off" />
          )}
        </Field>
        <Field label="Workspace" htmlFor="import-workspace" error={fieldErrors.workspaceId}>
          <Select id="import-workspace" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} disabled={!workspaces.length}>
            {workspaces.length ? (
              workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))
            ) : (
              <option value="">No workspace where you can create projects</option>
            )}
          </Select>
        </Field>
        <Field label="Project name" htmlFor="import-name" error={fieldErrors.name} hint="Defaults to the repository name.">
          <Input id="import-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={repo?.name ?? "my-app"} />
        </Field>
        <p className="text-xs text-muted-foreground">Text files up to 1 MB each (max 2000 files) are imported; node_modules, build output and binaries are skipped.</p>
        <Button type="submit" className="w-full" disabled={!canSubmit} loading={busy}>
          <Download className="size-4" aria-hidden="true" /> {busy ? "Importing…" : "Import repository"}
        </Button>
        {result ? (
          <Alert variant="success" title={`Imported ${result.imported} files`}>
            Opening {result.project.name}… {result.skipped.length ? `${result.skipped.length} files were skipped.` : ""}
          </Alert>
        ) : null}
      </form>
    </div>
  );
}
