"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { filesApi } from "@/lib/client/workspace/api";
import type { SearchResult } from "@/lib/client/workspace/types";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { FileIcon } from "./file-icon";

export function SearchPanel({ projectId, onOpen, focusKey }: { projectId: string; onOpen: (path: string, line: number) => void; focusKey: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusKey]);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await filesApi.search(projectId, q);
        if (!cancelled) {
          setResults(res.results);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, projectId]);

  const grouped = results
    ? results.reduce<Record<string, SearchResult[]>>((acc, r) => {
        (acc[r.path] ??= []).push(r);
        return acc;
      }, {})
    : {};

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-2">
        <label htmlFor="ws-search" className="sr-only">
          Search in project
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id="ws-search"
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                setResults(null);
                setError(null);
                setLoading(false);
              }
            }}
            placeholder="Search across files…" className="h-9 pl-8 text-[13px]" />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin" aria-live="polite">
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
            <Spinner /> Searching…
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="px-3 py-3 text-xs text-danger">
            {error}
          </p>
        ) : null}
        {!loading && results && results.length === 0 ? <p className="px-3 py-6 text-center text-xs text-muted-foreground">No results for “{query.trim()}”.</p> : null}
        {!results && !loading && !error ? <p className="px-3 py-6 text-center text-xs text-muted-foreground">Type to search file contents. Results open at the matching line.</p> : null}
        {Object.entries(grouped).map(([path, rows]) => (
          <div key={path} className="py-1">
            <p className="flex items-center gap-1.5 truncate px-3 py-1 text-[11.5px] font-medium" title={path}>
              <FileIcon name={path.split("/").pop() ?? path} className="size-3.5" />
              <span className="truncate">{path}</span>
              <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">{rows.length}</span>
            </p>
            {rows.map((r) => (
              <button
                key={`${r.path}:${r.line}`}
                type="button"
                onClick={() => onOpen(r.path, r.line)}
                className="flex w-full items-start gap-2 px-3 py-1 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">{r.line}</span>
                <span className="truncate font-mono">{r.text.trim()}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
