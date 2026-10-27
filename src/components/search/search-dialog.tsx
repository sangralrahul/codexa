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
import {
  ArrowRight,
  BookA,
  BookOpen,
  Clock,
  CornerDownLeft,
  FileText,
  GraduationCap,
  LayoutTemplate,
  LifeBuoy,
  Loader2,
  Map,
  Newspaper,
  Plug,
  Search,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isCalm } from "@/lib/client/motion";

/**
 * Site-wide search. Public API (kept stable for other modules):
 *   <SearchTrigger className? compact? variant? />  — button that opens the dialog
 *   <SearchDialog />                                 — mount once per page; opens on Cmd/Ctrl+K
 *   openSearch(query?)                               — open it from anywhere, optionally pre-filled
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

const TYPE_ICON: Record<ResultType, LucideIcon> = {
  docs: BookOpen,
  guides: Map,
  tutorials: GraduationCap,
  blog: Newspaper,
  help: LifeBuoy,
  changelog: Sparkles,
  glossary: BookA,
  templates: LayoutTemplate,
  integrations: Plug,
};

/** Real pages to jump to when the box is empty (no invented popularity). */
const QUICK_LINKS: { title: string; href: string; type: ResultType }[] = [
  { title: "Quickstart", href: "/docs/quickstart", type: "docs" },
  { title: "AI agent", href: "/docs/ai-agent", type: "docs" },
  { title: "Deployment", href: "/docs/deployment", type: "docs" },
  { title: "Troubleshooting", href: "/docs/troubleshooting", type: "docs" },
  { title: "Starter templates", href: "/templates", type: "templates" },
];

/** Open the search dialog from anywhere; `query` pre-fills the box. */
export function openSearch(query?: unknown) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: typeof query === "string" ? query : "" }));
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

/**
 * Rotates through example queries a couple of times, then rests on the first one, so the motion
 * stops well before 5 seconds (no pause control needed). Static when calm.
 */
function useRotatingExample(examples: string[]) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (examples.length < 2 || isCalm()) return;
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setIndex(n >= 3 ? 0 : n % examples.length);
      if (n >= 3) window.clearInterval(id);
    }, 1400);
    return () => window.clearInterval(id);
  }, [examples]);
  return examples[index] ?? "";
}

/** `compact`: icon only below 2xl screens (crowded headers). `variant="hero"`: the 56px glass field of hub pages. */
export function SearchTrigger({
  className,
  compact,
  variant = "default",
  examples,
  label = "Search docs…",
}: {
  className?: string;
  compact?: boolean;
  variant?: "default" | "hero";
  /** Hero only: example queries that rotate in the field. */
  examples?: string[];
  label?: string;
}) {
  const isMac = useIsMac();
  const host = useDialogHost();
  const example = useRotatingExample(variant === "hero" ? (examples ?? []) : []);
  if (variant === "hero") {
    return (
      <>
        <button
          type="button"
          onClick={() => openSearch()}
          aria-label="Search documentation"
          aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
          className={cn(
            "group glass relative flex h-14 w-full items-center gap-3 rounded-2xl border border-border-strong px-4 text-left shadow-lg transition-[border-color,box-shadow] duration-(--dur-3)",
            "hover:border-foreground/25 focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_color-mix(in_oklab,var(--ring)_60%,transparent),0_0_0_5px_color-mix(in_oklab,var(--signal)_16%,transparent),var(--shadow-lg)]",
            className,
          )}
        >
          <Search className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={1.75} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[15px] text-muted-foreground">
            {examples?.length ? (
              <>
                <span className="hidden sm:inline">Search for </span>
                <span key={example} className="stage-swap inline-block text-foreground/80">
                  “{example}”
                </span>
              </>
            ) : (
              label
            )}
          </span>
          <kbd className="hidden shrink-0 items-center gap-1 rounded-md border border-border-strong bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground sm:inline-flex" aria-hidden="true">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
        {host ? <SearchDialogInner /> : null}
      </>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => openSearch()}
        aria-label="Search documentation"
        aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
        className={cn(
          "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card/60 text-sm text-muted-foreground shadow-[inset_0_1px_0_var(--hairline)] transition-colors duration-(--dur-2) hover:border-border-strong hover:text-foreground",
          compact ? "w-9 2xl:w-auto 2xl:min-w-[11rem] 2xl:justify-between 2xl:px-3" : "w-9 sm:w-auto sm:min-w-[11rem] sm:justify-between sm:px-3",
          className,
        )}
      >
        <span className="inline-flex items-center gap-2">
          <Search className="size-4" aria-hidden="true" />
          <span className={compact ? "hidden 2xl:inline" : "hidden sm:inline"}>{label}</span>
        </span>
        <kbd className={compact ? "hidden 2xl:inline-block" : "hidden sm:inline-block"} aria-hidden="true">
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

/** Wraps the matched words of `text` in <mark>. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const words = query.trim().split(/\s+/).filter((w) => w.length > 1).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.join("|")})`, "ig");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[2px] bg-selection text-foreground">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
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
  const handleOpenChange = useCallback((next: boolean, initialQuery = "") => {
    setOpen(next);
    if (next) {
      setRecent(readRecent());
      setQuery(initialQuery);
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
    const onOpen = (e: Event) => handleOpenChange(true, typeof (e as CustomEvent).detail === "string" ? (e as CustomEvent<string>).detail : "");
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
    <RD.Root open={open} onOpenChange={(o) => handleOpenChange(o)}>
      <RD.Portal>
        <RD.Overlay className="cx-overlay fixed inset-0 z-50 bg-background/55 backdrop-blur-[4px]" />
        <RD.Content
          className="cx-dialog e2 fixed left-1/2 top-[9vh] z-50 flex max-h-[80vh] w-[calc(100%-1.5rem)] max-w-[640px] -translate-x-1/2 flex-col overflow-hidden rounded-[18px] focus:outline-none"
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
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-4">
            {status === "loading" ? (
              <Loader2
                className="size-5 shrink-0 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <Search
                className="size-5 shrink-0 text-muted-foreground"
                strokeWidth={1.75}
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
              className="h-14 w-full bg-transparent text-[16px] outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            <RD.Close
              className="rounded-md px-1.5 py-1 font-mono text-[11px] text-muted-foreground ring-1 ring-border transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close search"
            >
              <span aria-hidden="true" className="hidden sm:inline">Esc</span>
              <X className="size-4 sm:hidden" aria-hidden="true" />
            </RD.Close>
          </div>
          <div
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-(--dur-2)",
                  filter === f.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2"
            aria-live="polite"
          >
            {status === "error" ? (
              <p
                role="alert"
                className="px-3 py-8 text-center text-sm text-danger"
              >
                Search is unavailable right now. Please try again in a moment.
              </p>
            ) : showRecent || query.trim().length === 0 ? (
              <div className="space-y-3 py-1">
                {showRecent ? (
                  <div>
                    <p className="text-label px-3 pb-1.5 pt-2 text-muted-foreground">
                      Recent searches
                    </p>
                    <ul>
                      {recent.map((r) => (
                        <li key={r}>
                          <button
                            type="button"
                            onClick={() => setQuery(r)}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
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
                ) : null}
                <div>
                  <p className="text-label px-3 pb-1.5 pt-2 text-muted-foreground">Jump to</p>
                  <ul>
                    {QUICK_LINKS.map((l) => {
                      const Icon = TYPE_ICON[l.type];
                      return (
                        <li key={l.href}>
                          <Link
                            href={l.href}
                            onClick={() => handleOpenChange(false)}
                            className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                          >
                            <span className="grid size-7 place-items-center rounded-md border border-border bg-surface text-muted-foreground">
                              <Icon className="size-3.5" aria-hidden="true" />
                            </span>
                            {l.title}
                            <ArrowRight className="ml-auto size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : status === "done" && items.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <p className="text-sm font-medium">No results for “{query.trim()}”</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different word, or browse the{" "}
                  <Link
                    href="/docs"
                    className="link-draw text-foreground"
                    onClick={() => handleOpenChange(false)}
                  >
                    documentation
                  </Link>
                  .
                </p>
              </div>
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
                    className="text-label px-3 pb-1.5 pt-2 text-muted-foreground"
                  >
                    Suggestions
                  </li>
                ) : null}
                {items.map((item, i) => {
                  const Icon = TYPE_ICON[item.type] ?? FileText;
                  const active = i === activeIndex;
                  return (
                    <li
                      key={`${item.type}:${item.href}`}
                      id={`${listId}-opt-${i}`}
                      role="option"
                      aria-selected={active}
                      data-index={i}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => go(item.href)}
                      className={cn(
                        "relative flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-(--dur-1)",
                        "before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-full before:bg-signal before:opacity-0",
                        active ? "bg-muted before:opacity-100" : "",
                      )}
                    >
                      <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border border-border bg-surface", active ? "text-foreground" : "text-muted-foreground")}>
                        <Icon className="size-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            <Highlighted text={item.title} query={query} />
                          </span>
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-foreground-dim">
                            {item.type}
                          </span>
                        </div>
                        {item.snippet ? (
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            <Highlighted text={item.snippet} query={query} />
                          </p>
                        ) : null}
                      </div>
                      <CornerDownLeft
                        className={cn(
                          "mt-1.5 size-3.5 shrink-0 text-muted-foreground transition-opacity",
                          active ? "opacity-100" : "opacity-0",
                        )}
                        aria-hidden="true"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="hidden shrink-0 items-center justify-between border-t border-border bg-surface/50 px-4 py-2 text-[11px] text-muted-foreground sm:flex">
            <span className="flex items-center gap-3">
              <span>
                <kbd>↑</kbd> <kbd>↓</kbd> navigate
              </span>
              <span>
                <kbd>Enter</kbd> open
              </span>
              <span>
                <kbd>Esc</kbd> close
              </span>
            </span>
            <span>Content search only; your projects are not included.</span>
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
