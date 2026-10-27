"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Globe2, LocateFixed, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClasses } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { offsetMinutes, timeIn, utcOffset } from "./time";

type Zone = { id: string; city: string; region: string; offset: string; minutes: number; time: string };

/** The list is windowed: fixed-height rows, only the rows near the viewport are rendered (~400 zones). */
const ROW = 44;
const VIEW = 300;
const OVERSCAN = 6;

/** One formatter per zone gives both the local time and the offset ("5:10 PM", "GMT+5:30"). */
function describe(id: string, now: Date): Zone {
  const parts = id.split("/");
  const city = (parts[parts.length - 1] ?? id).replace(/_/g, " ");
  const region = parts.length > 1 ? parts.slice(0, -1).join(" / ").replace(/_/g, " ") : "";
  try {
    const fp = new Intl.DateTimeFormat("en-US", { timeZone: id, hour: "numeric", minute: "2-digit", timeZoneName: "shortOffset" }).formatToParts(now);
    const offset = fp.find((p) => p.type === "timeZoneName")?.value ?? "";
    const time = fp
      .filter((p) => p.type !== "timeZoneName")
      .map((p) => p.value)
      .join("")
      .trim();
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(offset);
    const minutes = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
    return { id, city, region, offset, minutes, time };
  } catch {
    return { id, city, region, offset: utcOffset(id, now), minutes: offsetMinutes(id, now), time: timeIn(id, now) };
  }
}

/**
 * The described, offset-sorted zone list, cached per minute (the times shown are minute-precise).
 * Warmed in idle time after mount, so opening the picker does not format ~400 zones on the click.
 */
let zoneCache: { minute: number; key: string; zones: Zone[] } | null = null;
function describeAll(ids: string[], now = new Date()): Zone[] {
  const minute = Math.floor(now.getTime() / 60_000);
  const key = `${ids.length}:${ids[0]}:${ids[ids.length - 1]}`;
  if (zoneCache && zoneCache.minute === minute && zoneCache.key === key) return zoneCache.zones;
  const zones = ids.map((z) => describe(z, now)).sort((a, b) => a.minutes - b.minutes || a.id.localeCompare(b.id));
  zoneCache = { minute, key, zones };
  return zones;
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
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const uid = useId();
  const listId = `${uid}-list`;

  const ids = useMemo(() => (zones.includes(value) ? zones : [value, ...zones]), [zones, value]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBrowser(browserZone()));
    // Warm the zone list while the page is idle.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
    const idle = w.requestIdleCallback ? w.requestIdleCallback(() => describeAll(ids), { timeout: 3000 }) : window.setTimeout(() => describeAll(ids), 1200);
    return () => {
      cancelAnimationFrame(id);
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, [ids]);

  const all = useMemo(() => (open ? describeAll(ids) : ([] as Zone[])), [open, ids]);

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

  // Keep the active option in view (rows have a fixed height, so this is arithmetic, not a DOM query).
  useEffect(() => {
    const el = listRef.current;
    if (!open || !el) return;
    const top = active * ROW;
    const pinned = browser && browser !== value && !query && active > 0 ? ROW : 0;
    if (top < el.scrollTop + pinned) el.scrollTop = top - pinned;
    else if (top + ROW > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW - el.clientHeight;
  }, [active, open, browser, value, query]);

  const choose = (tz: string) => {
    onValueChange(tz);
    setOpen(false);
    setQuery("");
  };

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      setQuery("");
      // Start on the current zone (after the browser shortcut when it is shown), centred in the list.
      const shortcut = browser && browser !== value ? 1 : 0;
      const idx = Math.max(0, describeAll(ids).findIndex((z) => z.id === value)) + shortcut;
      const top = Math.max(0, idx * ROW - (VIEW - ROW) / 2);
      setActive(idx);
      setScrollTop(top);
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = top;
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
              setScrollTop(0);
              if (listRef.current) listRef.current.scrollTop = 0;
            }}
            onKeyDown={onKey}
            placeholder="City, region or offset (+5:30)"
            className="h-11 w-full bg-transparent pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Time zones"
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          className="scrollbar-thin max-h-[300px] overflow-y-auto px-1"
        >
          {items.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-muted-foreground" role="presentation">
              No time zone matches “{query}”.
            </li>
          ) : (
            (() => {
              // "Use browser time zone" (index 0, when shown) stays pinned at the top while the list scrolls.
              const pin = "browser" in items[0];
              const start = Math.max(pin ? 1 : 0, Math.floor(scrollTop / ROW) - OVERSCAN);
              const end = Math.min(items.length, Math.ceil((scrollTop + VIEW) / ROW) + OVERSCAN);
              const row = (i: number) => {
                const z = items[i];
                const isBrowser = "browser" in z;
                const selected = z.id === value && !isBrowser;
                return (
                  <li
                    key={`${isBrowser ? "b:" : ""}${z.id}`}
                    id={`${uid}-opt-${i}`}
                    role="option"
                    aria-selected={selected}
                    aria-setsize={items.length}
                    aria-posinset={i + 1}
                    data-index={i}
                    onPointerMove={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(z.id)}
                    style={{ height: ROW }}
                    className={cn(
                      "relative flex cursor-default items-center gap-2.5 rounded-lg px-2.5 text-[13px]",
                      isBrowser && "sticky top-0 z-[1] rounded-none border-b border-border/70 bg-card",
                      i === active && "bg-muted",
                    )}
                  >
                    {isBrowser ? <LocateFixed className="size-4 shrink-0 text-signal-ink" aria-hidden="true" /> : <span aria-hidden="true" className="w-4 shrink-0" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium leading-4">{isBrowser ? "Use browser time zone" : z.city}</span>
                      <span className="mt-0.5 block truncate text-xs leading-4 text-muted-foreground">{isBrowser ? z.id.replace(/_/g, " ") : z.region || "—"}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-[11px] leading-4 tabular-nums text-foreground-dim">{z.offset}</span>
                      <span className="block font-mono text-[11px] leading-4 tabular-nums text-muted-foreground">{z.time}</span>
                    </span>
                    {selected ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <span aria-hidden="true" className="w-4 shrink-0" />}
                  </li>
                );
              };
              const before = (start - (pin ? 1 : 0)) * ROW;
              const out: React.ReactNode[] = [];
              if (pin) out.push(row(0));
              if (before > 0) out.push(<li key="pad-top" role="presentation" aria-hidden="true" style={{ height: before }} />);
              for (let i = start; i < end; i++) out.push(row(i));
              if (end < items.length) out.push(<li key="pad-end" role="presentation" aria-hidden="true" style={{ height: (items.length - end) * ROW }} />);
              return out;
            })()
          )}
        </ul>
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          {filtered.length} zone{filtered.length === 1 ? "" : "s"} · ↑↓ to move, Enter to choose
        </p>
      </PopoverContent>
    </Popover>
  );
}
