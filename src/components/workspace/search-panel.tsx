"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { filesApi } from "@/lib/client/workspace/api";
import type { SearchResult } from "@/lib/client/workspace/types";
import { Spinner } from "@/components/ui/misc";
import { FileIcon } from "./file-icon";

/** Full-text search across the project's files; results open at the matching line. */
export function SearchPanel({ projectId, onOpen, focusKey, header }: { projectId: string; onOpen: (path: string, line: number) => void; focusKey: number; header?: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusKey) return;
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
  const q = query.trim();

  const highlight = (text: string) => {
    const t = text.trim();
    if (!q) return t;
    const i = t.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return t;
    return (
      <>
        {t.slice(0, i)}
        <mark className="rounded-[3px] bg-signal/20 text-foreground">{t.slice(i, i + q.length)}</mark>
        {t.slice(i + q.length)}
      </>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {header ? <div className="flex h-10 shrink-0 items-center px-2">{header}</div> : null}
      <div className="px-2 pb-2">
        <label htmlFor="ws-search" className="sr-only">
          Search in project
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
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
            placeholder="Search across files…"
            className="h-8 w-full rounded-lg bg-muted pl-8 pr-7 text-[13px] shadow-[inset_0_0_0_1px_var(--border)] outline-none placeholder:text-muted-foreground focus-visible:shadow-[inset_0_0_0_1px_var(--border-strong),0_0_0_3px_color-mix(in_oklab,var(--ring)_18%,transparent)]"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setResults(null);
                inputRef.current?.focus();
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-auto" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Spinner /> Searching…
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}
        {!loading && results && results.length === 0 ? <p className="px-3 py-6 text-center text-xs text-muted-foreground">No results for “{q}”.</p> : null}
        {!results && !loading && !error ? <p className="px-4 py-6 text-center text-xs leading-relaxed text-muted-foreground">Type to search file contents. Results open at the matching line.</p> : null}
        {results && results.length ? (
          <p className="px-3 pb-1 text-[11px] text-muted-foreground">
            {results.length} result{results.length === 1 ? "" : "s"} in {Object.keys(grouped).length} file{Object.keys(grouped).length === 1 ? "" : "s"}
          </p>
        ) : null}
        {Object.entries(grouped).map(([path, rows]) => (
          <div key={path} className="py-0.5">
            <p className="flex items-center gap-1.5 truncate px-3 py-1 text-[12px] font-medium" title={path}>
              <FileIcon name={path.split("/").pop() ?? path} className="size-3.5" />
              <span className="truncate">{path.split("/").pop()}</span>
              <span className="truncate text-[11px] font-normal text-muted-foreground">{path.split("/").slice(0, -1).join("/")}</span>
              <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">{rows.length}</span>
            </p>
            {rows.map((r) => (
              <button
                key={`${r.path}:${r.line}`}
                type="button"
                onClick={() => onOpen(r.path, r.line)}
                className="flex w-full items-start gap-2 rounded-md px-3 py-1 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <span className="w-7 shrink-0 text-right font-mono tabular-nums text-muted-foreground">{r.line}</span>
                <span className="truncate font-mono text-[11.5px]">{highlight(r.text)}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
