"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Globe2, LocateFixed, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClasses } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { offsetMinutes, timeIn, utcOffset } from "./time";

type Zone = { id: string; city: string; region: string; offset: string; minutes: number; time: string };

function describe(id: string, now: Date): Zone {
  const parts = id.split("/");
  const city = (parts[parts.length - 1] ?? id).replace(/_/g, " ");
  const region = parts.length > 1 ? parts.slice(0, -1).join(" / ").replace(/_/g, " ") : "";
  return { id, city, region, offset: utcOffset(id, now), minutes: offsetMinutes(id, now), time: timeIn(id, now) };
}

function browserZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Searchable time-zone picker. The trigger keeps `id` (so <label htmlFor> and getByLabel work)
 * and shows the zone, its UTC offset and the time there. The list filters by city, region or
 * offset ("+5:30", "GMT-8"), offers "Use browser time zone" first, and is fully keyboard driven.
 */
export function TimezoneCombobox({
  id,
  value,
  onValueChange,
  zones,
  disabled,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id: string;
  value: string;
  onValueChange: (tz: string) => void;
  zones: string[];
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [browser, setBrowser] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const uid = useId();
  const listId = `${uid}-list`;

  useEffect(() => {
    const id = requestAnimationFrame(() => setBrowser(browserZone()));
    return () => cancelAnimationFrame(id);
  }, []);

  const all = useMemo(() => {
    if (!open) return [] as Zone[];
    const now = new Date();
    const ids = zones.includes(value) ? zones : [value, ...zones];
    return ids.map((z) => describe(z, now)).sort((a, b) => a.minutes - b.minutes || a.id.localeCompare(b.id));
  }, [open, zones, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, " ");
    if (!q) return all;
    const words = q.split(" ");
    return all.filter((z) => {
      const hay = `${z.id.replace(/_/g, " ")} ${z.offset} ${z.offset.replace("GMT", "UTC")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [all, query]);

  const showBrowser = Boolean(browser && browser !== value && !query);
  const items = useMemo(() => (showBrowser && browser ? [{ ...describe(browser, new Date()), browser: true as const }, ...filtered] : filtered), [showBrowser, browser, filtered]);

  // Keep the active option in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (tz: string) => {
    onValueChange(tz);
    setOpen(false);
    setQuery("");
  };

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      setQuery("");
      // Start on the current zone (after the browser shortcut when it is shown).
      requestAnimationFrame(() => {
        const idx = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.dataset.index;
        setActive(idx ? Number(idx) : 0);
      });
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(items.length - 1);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 8));
    } else if (e.key === "PageUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 8));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const z = items[active];
      if (z) choose(z.id);
    }
  };

  const current = describe(value, new Date());

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn(controlClasses, "group flex h-10 items-center gap-2.5 px-3 text-left data-[state=open]:border-ring/70 data-[state=open]:shadow-[0_0_0_4px_color-mix(in_oklab,var(--signal)_14%,transparent)]")}
        >
          <Globe2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {current.city}
            {current.region ? <span className="text-muted-foreground"> · {current.region}</span> : null}
          </span>
          {current.offset ? <span className="hidden shrink-0 font-mono text-[11px] text-foreground-dim sm:inline">{current.offset}</span> : null}
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[max(var(--radix-popover-trigger-width),340px)] overflow-hidden p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-foreground-dim" aria-hidden="true" />
          <input
            autoFocus
            type="text"
            role="combobox"
            aria-label="Search time zones"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={items[active] ? `${uid}-opt-${active}` : undefined}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="City, region or offset (+5:30)"
            className="h-11 w-full bg-transparent pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul ref={listRef} id={listId} role="listbox" aria-label="Time zones" className="scrollbar-thin max-h-[300px] overflow-y-auto p-1">
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-muted-foreground" role="presentation">
              No time zone matches “{query}”.
            </li>
          ) : (
            items.map((z, i) => {
              const isBrowser = "browser" in z;
              const selected = z.id === value && !isBrowser;
              return (
                <li
                  key={`${isBrowser ? "b:" : ""}${z.id}`}
                  id={`${uid}-opt-${i}`}
                  role="option"
                  aria-selected={selected}
                  data-index={i}
                  onPointerMove={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(z.id)}
                  className={cn(
                    "relative flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]",
                    i === active && "bg-muted",
                    isBrowser && "mb-1 border-b border-border/70 pb-2.5",
                  )}
                >
                  {isBrowser ? <LocateFixed className="size-4 shrink-0 text-signal-ink" aria-hidden="true" /> : <span aria-hidden="true" className="w-4 shrink-0" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{isBrowser ? "Use browser time zone" : z.city}</span>
                    <span className="block truncate text-xs text-muted-foreground">{isBrowser ? z.id.replace(/_/g, " ") : z.region || "—"}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-[11px] tabular-nums text-foreground-dim">{z.offset}</span>
                    <span className="block font-mono text-[11px] tabular-nums text-muted-foreground">{z.time}</span>
                  </span>
                  {selected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <span aria-hidden="true" className="w-4 shrink-0" />}
                </li>
              );
            })
          )}
        </ul>
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          {filtered.length} zone{filtered.length === 1 ? "" : "s"} · ↑↓ to move, Enter to choose
        </p>
      </PopoverContent>
    </Popover>
  );
}
