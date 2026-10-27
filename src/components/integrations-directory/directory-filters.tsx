"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";
import type { IntegrationCategory } from "@/config/integrations";
import type { IntegrationSearch } from "./search";

type Props = {
  value: IntegrationSearch;
  categories: { id: IntegrationCategory; name: string }[];
  resultCount: number;
};

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "available", label: "Available", description: "An adapter exists today" },
  { value: "planned", label: "Planned", description: "On the roadmap; nothing to connect yet" },
];

/** URL-synced search, category chips and status filter (the same styled SelectMenu as the templates gallery) for the integrations directory. */
export function DirectoryFilters({ value, categories, resultCount }: Props) {
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

  function navigate(next: Partial<IntegrationSearch>) {
    const sp = new URLSearchParams(params.toString());
    const merged = { ...value, q, ...next };
    const set = (k: string, v: string, def: string) => (v && v !== def ? sp.set(k, v) : sp.delete(k));
    set("q", merged.q.trim(), "");
    set("category", merged.category, "all");
    set("status", merged.status, "all");
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
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
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]"
      >
        <div className="relative">
          <Label htmlFor="integration-search" className="sr-only">
            Search integrations
          </Label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="integration-search" type="search" value={q} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search integrations (e.g. postgres, stripe, email)" className="h-11 rounded-[12px] pl-9 pr-9" autoComplete="off" />
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
          <Label htmlFor="integration-status" className="sr-only">
            Status
          </Label>
          <SelectMenu
            id="integration-status"
            className="h-11 rounded-[12px]"
            value={value.status}
            onValueChange={(status) => navigate({ status: status as IntegrationSearch["status"] })}
            options={STATUS_OPTIONS}
          />
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

      <p className="font-mono text-[12.5px] text-muted-foreground" role="status" aria-live="polite">
        {pending ? "Updating…" : `${resultCount} integration${resultCount === 1 ? "" : "s"}`}
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
        "inline-flex h-8 items-center rounded-full border px-3.5 text-[13px] font-medium transition-[color,background-color,border-color] duration-(--dur-2) focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card/60 text-muted-foreground hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
