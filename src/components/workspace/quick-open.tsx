"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog as RD } from "radix-ui";
import { File, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { fuzzyScore } from "@/lib/client/workspace/paths";
import type { FileEntry } from "@/lib/client/workspace/types";

export function QuickOpen({ open, onOpenChange, files, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; files: FileEntry[]; onPick: (path: string) => void }) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-fade-in" />
        {/* The body unmounts when the dialog closes, so query/selection reset on every open. */}
        <Body
          files={files}
          onPick={(p) => {
            onPick(p);
            onOpenChange(false);
          }}
        />
      </RD.Portal>
    </RD.Root>
  );
}

function Body({ files, onPick }: { files: FileEntry[]; onPick: (path: string) => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = query.trim();
    const scored = files
      .map((f) => ({ path: f.path, score: fuzzyScore(q, f.path) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    return scored.slice(0, 50);
  }, [files, query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const pick = onPick;

  return (
        <RD.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-lg focus:outline-none data-[state=open]:animate-fade-in"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const r = results[index];
              if (r) pick(r.path);
            }
          }}
        >
          <RD.Title className="sr-only">Quick open</RD.Title>
          <RD.Description className="sr-only">Type to filter files, use arrow keys and Enter to open.</RD.Description>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIndex(0);
              }}
              placeholder="Search files by name…"
              aria-label="Search files"
              role="combobox"
              aria-expanded="true"
              aria-controls="quick-open-results"
              aria-activedescendant={results[index] ? `qo-${index}` : undefined}
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul id="quick-open-results" ref={listRef} role="listbox" className="max-h-[50vh] overflow-y-auto p-1 scrollbar-thin">
            {results.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matching files</li> : null}
            {results.map((r, i) => (
              <li
                key={r.path}
                id={`qo-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === index}
                onMouseEnter={() => setIndex(i)}
                onClick={() => pick(r.path)}
                className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm", i === index ? "bg-muted" : "hover:bg-muted/60")}
              >
                <File className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{r.path}</span>
              </li>
            ))}
          </ul>
        </RD.Content>
  );
}
