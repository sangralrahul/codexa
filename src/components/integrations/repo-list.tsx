"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FolderGit2, Lock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState, Skeleton } from "@/components/ui/misc";
import { api, ClientApiError } from "@/lib/client/api";

export type RepoItem = {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  htmlUrl: string;
  pushedAt: string | null;
  canPush: boolean;
  language: string | null;
};

type ReposResponse = { repos: RepoItem[]; page: number; hasMore: boolean; username: string | null };

export function useRepoSearch() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ClientApiError | Error | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async (query: string, p: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<ReposResponse>(`/api/v1/integrations/github/repos?q=${encodeURIComponent(query)}&page=${p}&perPage=30`);
      setRepos((prev) => (append ? [...prev, ...data.repos.filter((r) => !prev.some((x) => x.id === r.id))] : data.repos));
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Could not load repositories"));
      if (!append) setRepos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(debounced, 1, false), 0);
    return () => clearTimeout(t);
  }, [debounced, load]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void load(debounced, next, true);
  };

  return { q, setQ, repos, hasMore, loading, error, loadMore, reload: () => load(debounced, 1, false) };
}

export function RepoErrorState({ error }: { error: ClientApiError | Error }) {
  const code = error instanceof ClientApiError ? error.code : "error";
  if (code === "github_not_linked") {
    return (
      <EmptyState
        icon={<FolderGit2 className="size-8" aria-hidden="true" />}
        title="Connect your GitHub account"
        description="Link GitHub to browse and import your repositories."
        action={
          <Button asChild>
            <Link href="/connect-github?next=/dashboard/github">Connect GitHub</Link>
          </Button>
        }
      />
    );
  }
  if (code === "not_configured") {
    return (
      <Alert variant="warning" title="GitHub is not configured on this server">
        {error.message}
      </Alert>
    );
  }
  return (
    <Alert variant="danger" title="Could not load repositories">
      {error.message}
    </Alert>
  );
}

/** Searchable repository list with an action per row (import / select). */
export function RepoList({
  onSelect,
  selectedId,
  actionLabel = "Import",
  renderAction,
}: {
  onSelect?: (repo: RepoItem) => void;
  selectedId?: number | null;
  actionLabel?: string;
  renderAction?: (repo: RepoItem) => React.ReactNode;
}) {
  const { q, setQ, repos, hasMore, loading, error, loadMore } = useRepoSearch();
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="repo-search" className="sr-only">
          Search repositories
        </label>
        <Input id="repo-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search repositories by name…" className="pl-9" autoComplete="off" />
      </div>
      {error ? <RepoErrorState error={error} /> : null}
      {loading && !repos.length ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading repositories">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : null}
      {!loading && !error && !repos.length ? (
        <EmptyState icon={<FolderGit2 className="size-8" aria-hidden="true" />} title={q ? "No repositories match" : "No repositories found"} description={q ? "Try a different search." : "Your GitHub account has no repositories you can access yet."} />
      ) : null}
      {repos.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card" aria-label="Repositories">
          {repos.map((r) => {
            const selected = selectedId === r.id;
            return (
              <li key={r.id} className={selected ? "bg-primary/5" : undefined}>
                <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-mono text-sm font-medium">{r.fullName}</span>
                      {r.private ? (
                        <Badge variant="outline">
                          <Lock className="size-3" aria-hidden="true" /> private
                        </Badge>
                      ) : null}
                      {r.language ? <Badge>{r.language}</Badge> : null}
                      {!r.canPush ? <Badge variant="warning">read-only</Badge> : null}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.description || "No description"}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {r.defaultBranch}
                      {r.pushedAt ? ` · pushed ${new Date(r.pushedAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a href={r.htmlUrl} target="_blank" rel="noreferrer" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Open ${r.fullName} on GitHub`}>
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </a>
                    {renderAction ? (
                      renderAction(r)
                    ) : onSelect ? (
                      <Button size="sm" variant={selected ? "primary" : "outline"} onClick={() => onSelect(r)} aria-pressed={selected}>
                        {selected ? "Selected" : actionLabel}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {hasMore && !error ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={loadMore} loading={loading}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
