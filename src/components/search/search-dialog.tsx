"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as RD } from "radix-ui";
import { ArrowRight, Clock, FileText, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Site-wide search. Public API (kept stable for other modules):
 *   <SearchTrigger className? />  — button that opens the dialog
 *   <SearchDialog />              — mount once per page; opens on Cmd/Ctrl+K
 */

const OPEN_EVENT = "codexa:search-open";
const RECENT_KEY = "codexa:recent-searches";
const MAX_RECENT = 6;

type ResultType =
  | "docs"
  | "guides"
  | "tutorials"
  | "blog"
  | "help"
  | "changelog"
  | "glossary"
  | "templates"
  | "integrations";
type Result = {
  type: ResultType;
  title: string;
  description: string;
  href: string;
  snippet: string;
};
type Suggestion = { title: string; href: string; type: ResultType };

const FILTERS: { id: ResultType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "docs", label: "Docs" },
  { id: "guides", label: "Guides" },
  { id: "tutorials", label: "Tutorials" },
  { id: "blog", label: "Blog" },
  { id: "help", label: "Help" },
  { id: "changelog", label: "Changelog" },
  { id: "glossary", label: "Glossary" },
  { id: "templates", label: "Templates" },
];

export function openSearch() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

/**
 * Exactly one dialog instance should exist per page. The first component to
 * claim the host slot renders it; this lets <SearchTrigger /> work on pages
 * whose layout never mounted <SearchDialog /> explicitly, without creating a
 * dialog per trigger.
 */
let hostId: string | null = null;
const hostListeners = new Set<() => void>();
function subscribeHost(cb: () => void) {
  hostListeners.add(cb);
  return () => {
    hostListeners.delete(cb);
  };
}
function useDialogHost() {
  const id = useId();
  useEffect(() => {
    if (hostId !== null) return;
    hostId = id;
    hostListeners.forEach((cb) => cb());
    return () => {
      if (hostId !== id) return;
      hostId = null;
      hostListeners.forEach((cb) => cb());
    };
  }, [id]);
  return useSyncExternalStore(
    subscribeHost,
    () => hostId === id,
    () => false,
  );
}

const noopSubscribe = () => () => {};
/** True on Apple platforms after hydration; false during SSR so markup matches. */
function useIsMac() {
  return useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.platform ?? navigator.userAgent),
    () => false,
  );
}

export function SearchTrigger({ className }: { className?: string }) {
  const isMac = useIsMac();
  const host = useDialogHost();
  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        aria-label="Search documentation"
        aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
        className={cn(
          "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background text-sm text-muted-foreground transition hover:border-border-strong hover:text-foreground sm:justify-between sm:px-3",
          "w-9 sm:w-auto sm:min-w-[11rem]",
          className,
        )}
      >
        <span className="inline-flex items-center gap-2">
          <Search className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Search docs…</span>
        </span>
        <kbd className="hidden sm:inline-block" aria-hidden="true">
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
      </button>
      {host ? <SearchDialogInner /> : null}
    </>
  );
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list)
      ? list
          .filter((x): x is string => typeof x === "string")
          .slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    /* storage unavailable (private mode); ignore */
  }
}

export function SearchDialog() {
  const host = useDialogHost();
  return host ? <SearchDialogInner /> : null;
}

function SearchDialogInner() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ResultType | "all">("all");
  const [results, setResults] = useState<Result[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listId = useId();

  /** Single place that opens/closes the dialog and resets its transient state. */
  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (next) {
      setRecent(readRecent());
    } else {
      setQuery("");
      setResults([]);
      setSuggestions([]);
      setStatus("idle");
      setActiveIndex(0);
    }
  }, []);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Open on Cmd/Ctrl+K or the trigger event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleOpenChange(!openRef.current);
      }
    };
    const onOpen = () => handleOpenChange(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [handleOpenChange]);

  // Debounced fetch.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    abortRef.current?.abort();
    if (q.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const t = setTimeout(async () => {
      setStatus("loading");
      try {
        const params = new URLSearchParams({ q });
        if (filter !== "all") params.set("type", filter);
        const res = await fetch(`/api/v1/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        const data = (await res.json()) as {
          results: Result[];
          suggestions: Suggestion[];
        };
        setResults(data.results ?? []);
        setSuggestions(data.suggestions ?? []);
        setActiveIndex(0);
        setStatus("done");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
      }
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query, filter, open]);

  const items = useMemo<
    {
      title: string;
      href: string;
      type: ResultType;
      snippet?: string;
      kind: "result" | "suggestion";
    }[]
  >(() => {
    if (results.length)
      return results.map((r) => ({ ...r, kind: "result" as const }));
    return suggestions.map((s) => ({ ...s, kind: "suggestion" as const }));
  }, [results, suggestions]);

  const go = useCallback(
    (href: string) => {
      const q = query.trim();
      if (q) {
        const next = [q, ...recent.filter((r) => r !== q)];
        setRecent(next);
        writeRecent(next);
      }
      handleOpenChange(false);
      router.push(href);
    },
    [query, recent, router, handleOpenChange],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        items.length ? (i - 1 + items.length) % items.length : 0,
      );
    } else if (e.key === "Enter") {
      const item = items[activeIndex];
      if (item) {
        e.preventDefault();
        go(item.href);
      }
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const showRecent = query.trim().length === 0 && recent.length > 0;
  const activeId = items[activeIndex]
    ? `${listId}-opt-${activeIndex}`
    : undefined;

  return (
    <RD.Root open={open} onOpenChange={handleOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <RD.Content
          className="fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg focus:outline-none data-[state=open]:animate-fade-in"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <RD.Title className="sr-only">Search</RD.Title>
          <RD.Description className="sr-only">
            Search documentation, guides, tutorials, blog posts, help articles
            and templates.
          </RD.Description>
          <div className="flex items-center gap-2 border-b border-border px-3">
            {status === "loading" ? (
              <Loader2
                className="size-4 shrink-0 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <Search
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded={items.length > 0}
              aria-controls={listId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-label="Search"
              placeholder="Search docs, guides, help…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim().length === 0) {
                  setResults([]);
                  setSuggestions([]);
                  setStatus("idle");
                }
              }}
              onKeyDown={onKeyDown}
              autoComplete="off"
              className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <RD.Close
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close search"
            >
              <X className="size-4" />
            </RD.Close>
          </div>
          <div
            className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2"
            role="group"
            aria-label="Filter by type"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => {
                  setFilter(f.id);
                  inputRef.current?.focus();
                }}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-0.5 text-xs transition",
                  filter === f.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto p-2"
            aria-live="polite"
          >
            {status === "error" ? (
              <p
                role="alert"
                className="px-3 py-6 text-center text-sm text-danger"
              >
                Search is unavailable right now. Please try again in a moment.
              </p>
            ) : showRecent ? (
              <div>
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent searches
                </p>
                <ul>
                  {recent.map((r) => (
                    <li key={r}>
                      <button
                        type="button"
                        onClick={() => setQuery(r)}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <Clock
                          className="size-3.5 text-muted-foreground"
                          aria-hidden="true"
                        />
                        {r}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setRecent([]);
                    writeRecent([]);
                  }}
                  className="mt-1 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear recent searches
                </button>
              </div>
            ) : query.trim().length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Type to search. Use ↑ ↓ to move and Enter to open.
              </p>
            ) : status === "done" && items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No results for “{query.trim()}”. Try a different word, or browse
                the{" "}
                <Link
                  href="/docs"
                  className="text-primary underline"
                  onClick={() => handleOpenChange(false)}
                >
                  documentation
                </Link>
                .
              </p>
            ) : (
              <ul
                id={listId}
                ref={listRef}
                role="listbox"
                aria-label="Search results"
              >
                {items.length > 0 && items[0].kind === "suggestion" ? (
                  <li
                    role="presentation"
                    className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Suggestions
                  </li>
                ) : null}
                {items.map((item, i) => (
                  <li
                    key={`${item.type}:${item.href}`}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    data-index={i}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => go(item.href)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-md px-3 py-2",
                      i === activeIndex ? "bg-muted" : "",
                    )}
                  >
                    <FileText
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {item.title}
                        </span>
                        <span className="shrink-0 rounded-full border border-border px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {item.type}
                        </span>
                      </div>
                      {item.snippet ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {item.snippet}
                        </p>
                      ) : null}
                    </div>
                    <ArrowRight
                      className={cn(
                        "mt-1 size-3.5 shrink-0 text-muted-foreground",
                        i === activeIndex ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden="true"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="hidden items-center justify-between border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground sm:flex">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> to navigate · <kbd>Enter</kbd> to open ·{" "}
              <kbd>Esc</kbd> to close
            </span>
            <span>Content search only; your projects are not included.</span>
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
