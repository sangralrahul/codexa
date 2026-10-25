"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input, Label, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TemplateCategory } from "@/templates";

export type GalleryFilterState = { q: string; category: TemplateCategory | "all"; framework: string; sort: string };

type Props = {
  value: GalleryFilterState;
  categories: { id: TemplateCategory; name: string }[];
  frameworks: { id: string; name: string }[];
  /**
   * "path": category chips navigate to `${basePath}/${category}` (public gallery pages);
   * "query": category is a `category=` search param (in-app gallery).
   */
  categoryMode: "path" | "query";
  basePath: string;
  resultCount: number;
};

/** URL-synced search, category chips, framework filter and sort. Server components read the URL and render results. */
export function GalleryFilters({ value, categories, frameworks, categoryMode, basePath, resultCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(value.q);
  const debounce = useRef<number | null>(null);

  // Keep the input in sync when the URL changes from elsewhere (back button, chips).
  const [syncedQ, setSyncedQ] = useState(value.q);
  if (value.q !== syncedQ) {
    setSyncedQ(value.q);
    setQ(value.q);
  }

  function navigate(next: Partial<GalleryFilterState>) {
    const sp = new URLSearchParams(params.toString());
    const merged = { ...value, q, ...next };
    const set = (k: string, v: string, def: string) => (v && v !== def ? sp.set(k, v) : sp.delete(k));
    set("q", merged.q.trim(), "");
    set("framework", merged.framework, "all");
    set("sort", merged.sort, "featured");
    let path = pathname;
    if (categoryMode === "query") set("category", merged.category, "all");
    else {
      sp.delete("category");
      path = merged.category === "all" ? basePath : `${basePath}/${merged.category}`;
    }
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${path}?${qs}` : path, { scroll: false }));
  }

  function onSearchChange(next: string) {
    setQ(next);
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => navigate({ q: next }), 250);
  }

  return (
    <div className="space-y-4" aria-busy={pending || undefined}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (debounce.current) window.clearTimeout(debounce.current);
          navigate({ q });
        }}
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_160px]"
      >
        <div className="relative">
          <Label htmlFor="template-search" className="sr-only">
            Search templates
          </Label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="template-search" type="search" value={q} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search templates (e.g. kanban, express, landing)" className="pl-9 pr-9" autoComplete="off" />
          {q ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                navigate({ q: "" });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <div>
          <Label htmlFor="template-framework" className="sr-only">
            Framework
          </Label>
          <Select id="template-framework" value={value.framework} onChange={(e) => navigate({ framework: e.target.value })}>
            <option value="all">All frameworks</option>
            {frameworks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="template-sort" className="sr-only">
            Sort by
          </Label>
          <Select id="template-sort" value={value.sort} onChange={(e) => navigate({ sort: e.target.value })}>
            <option value="featured">Featured first</option>
            <option value="name">Name A–Z</option>
            <option value="difficulty">Difficulty</option>
          </Select>
        </div>
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <Chip active={value.category === "all"} onClick={() => navigate({ category: "all" })}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={value.category === c.id} onClick={() => navigate({ category: c.id })}>
            {c.name}
          </Chip>
        ))}
      </div>

      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {pending ? "Updating…" : `${resultCount} template${resultCount === 1 ? "" : "s"}`}
        {value.q ? ` matching “${value.q}”` : ""}
      </p>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
