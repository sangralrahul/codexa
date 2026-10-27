"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isCalm } from "@/lib/client/motion";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
import { ACCOUNT_NAV, WORKSPACE_NAV, searchSections, type SettingsNavItem, type SettingsNavKey } from "./nav-model";

export { ACCOUNT_NAV, WORKSPACE_NAV, type SettingsNavItem };

export type SettingsNavMetaView = {
  plan: string | null;
  seats: { used: number; limit: number } | null;
  integrations: { total: number; errors: number } | null;
  otherSessions: number;
};

/** Flash the settings card that holds `#id` once (and the element itself if it is not in a card). */
export function flashSection(hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  if (!id) return;
  let tries = 0;
  const run = () => {
    const el = document.getElementById(id);
    if (!el) {
      if (tries++ < 20) window.setTimeout(run, 60);
      return;
    }
    const card = (el.closest(".settings-card") as HTMLElement | null) ?? el;
    card.removeAttribute("data-flash");
    void card.offsetWidth;
    card.setAttribute("data-flash", "");
    window.setTimeout(() => card.removeAttribute("data-flash"), 1500);
    if (el.tagName === "DETAILS") (el as HTMLDetailsElement).open = true;
  };
  run();
}

function isActive(pathname: string, it: SettingsNavItem) {
  return it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/");
}

function MetaChip({ k, meta }: { k?: SettingsNavKey; meta: SettingsNavMetaView }) {
  const chip = "settings-meta ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 font-mono text-[10.5px] tabular-nums leading-none";
  if (k === "members" && meta.seats) {
    const { used, limit } = meta.seats;
    return (
      <span className={cn(chip, "bg-foreground/[0.06] text-muted-foreground")} title={limit < 0 ? `${used} seats used` : `${used} of ${limit} seats used`}>
        <span aria-hidden="true">{limit < 0 ? used : `${used}/${limit}`}</span>
        <span className="sr-only">{limit < 0 ? `, ${used} seats used` : `, ${used} of ${limit} seats used`}</span>
      </span>
    );
  }
  if (k === "billing" && meta.plan) {
    return (
      <span className={cn(chip, "bg-foreground/[0.06] font-sans text-[11px] font-medium text-muted-foreground")}>
        <span className="sr-only">, plan: </span>
        {meta.plan}
      </span>
    );
  }
  if (k === "integrations" && meta.integrations && meta.integrations.total > 0) {
    const { total, errors } = meta.integrations;
    return (
      <span className={cn(chip, errors ? "bg-danger/12 text-danger" : "bg-foreground/[0.06] text-muted-foreground")}>
        <span aria-hidden="true">{total}</span>
        <span className="sr-only">{`, ${total} connected${errors ? `, ${errors} with errors` : ""}`}</span>
      </span>
    );
  }
  if (k === "security" && meta.otherSessions > 0) {
    return (
      <span className="settings-meta ml-auto flex size-5 shrink-0 items-center justify-center" title={`${meta.otherSessions} other active session${meta.otherSessions === 1 ? "" : "s"}`}>
        <span aria-hidden="true" className="size-1.5 rounded-full bg-signal shadow-[0_0_0_3px_color-mix(in_oklab,var(--signal)_18%,transparent)]" />
        <span className="sr-only">{`, ${meta.otherSessions} other active session${meta.otherSessions === 1 ? "" : "s"}`}</span>
      </span>
    );
  }
  return null;
}

function NavLink({ it, active, meta, onNavigate }: { it: SettingsNavItem; active: boolean; meta: SettingsNavMetaView; onNavigate?: () => void }) {
  const Icon = it.icon;
  return (
    <Link
      href={it.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      data-nav-item=""
      className={cn(
        "nav-item relative z-[1] flex h-9 shrink-0 snap-center items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 text-[13.5px] outline-none transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring lg:h-[34px] lg:px-2.5",
        active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {Icon ? <Icon className={cn("size-4 shrink-0 transition-colors", active ? "text-foreground" : "text-foreground-dim")} aria-hidden="true" /> : null}
      <span>{it.label}</span>
      <span className="hidden lg:contents">
        <MetaChip k={it.key} meta={meta} />
      </span>
    </Link>
  );
}

/**
 * Settings sub-navigation.
 * - lg+: a sticky column with "Search settings", two groups (Account, Workspace), icons, live meta chips
 *   (seats, plan, connections, other sessions) and a pill that glides between items (M12). The current
 *   page keeps the .nav-item signal rail and aria-current="page".
 * - below lg: one scroll-snapping tab bar (both groups, a dot between them) with edge fades and a gliding
 *   underline; the active tab is centred on every navigation.
 */
export function SettingsNav({ workspaceName, meta }: { workspaceName: string | null; meta?: SettingsNavMetaView }) {
  const m: SettingsNavMetaView = meta ?? { plan: null, seats: null, integrations: null, otherSessions: 0 };
  const pathname = usePathname();
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const pill = useGlide(trackRef, { selector: '[aria-current="page"]', itemSelector: "[data-nav-item]", axis: "y", hover: true });
  const bar = useGlide(trackRef, { selector: '[aria-current="page"]', itemSelector: "[data-nav-item]", axis: "x" });
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchSections(query, Boolean(workspaceName)), [query, workspaceName]);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);

  // Below lg: centre the active tab and keep the edge fades in sync with the scroll position.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const fades = () => {
      const scrollable = el.scrollWidth > el.clientWidth + 1;
      el.toggleAttribute("data-fade-start", scrollable && el.scrollLeft > 4);
      el.toggleAttribute("data-fade-end", scrollable && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    const active = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (active && el.scrollWidth > el.clientWidth + 1) {
      const left = active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2;
      el.scrollTo({ left: Math.max(0, left), behavior: isCalm() ? "auto" : "smooth" });
    }
    fades();
    el.addEventListener("scroll", fades, { passive: true });
    window.addEventListener("resize", fades);
    return () => {
      el.removeEventListener("scroll", fades);
      window.removeEventListener("resize", fades);
    };
  }, [pathname]);

  // Deep links (#password, #invite …) flash their card once after navigation or a hash change.
  useEffect(() => {
    if (window.location.hash) flashSection(window.location.hash);
    const onHash = () => flashSection(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [pathname]);

  const go = (href: string) => {
    setQuery("");
    const [path, hash] = href.split("#");
    if (path === pathname && hash) {
      document.getElementById(hash)?.scrollIntoView({ behavior: isCalm() ? "auto" : "smooth", block: "start" });
      window.history.replaceState(null, "", `#${hash}`);
      flashSection(hash);
    } else {
      router.push(href);
    }
  };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (query) {
        e.preventDefault();
        setQuery("");
      } else searchRef.current?.blur();
    } else if (e.key === "Enter" && results[0]) {
      e.preventDefault();
      go(results[0].href);
    } else if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      resultsRef.current?.querySelector<HTMLElement>("a")?.focus();
    }
  };
  const onResultsKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const links = [...(resultsRef.current?.querySelectorAll<HTMLElement>("a") ?? [])];
    const i = links.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      links[Math.min(links.length - 1, i + 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i <= 0) searchRef.current?.focus();
      else links[i - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
      searchRef.current?.focus();
    }
  };

  const searching = query.trim().length > 0;

  return (
    <nav aria-label="Settings" className="-mx-4 sm:-mx-6 lg:sticky lg:top-[76px] lg:mx-0 lg:w-[var(--settings-nav-w)] lg:shrink-0 lg:self-start">
      <div className="relative mb-4 hidden lg:block">
        <label htmlFor="settings-search" className="sr-only">
          Search settings
        </label>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-foreground-dim" aria-hidden="true" />
        <input
          ref={searchRef}
          id="settings-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Search settings"
          autoComplete="off"
          aria-controls={searching ? "settings-search-results" : undefined}
          aria-describedby="settings-search-hint"
          className="h-9 w-full rounded-[10px] border border-border bg-background/60 pl-8 pr-8 text-[13px] text-foreground shadow-[inset_0_1px_0_var(--hairline)] outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground hover:border-border-strong focus-visible:border-ring/70 focus-visible:shadow-[0_0_0_4px_color-mix(in_oklab,var(--signal)_14%,transparent)] [&::-webkit-search-cancel-button]:hidden"
        />
        <span id="settings-search-hint" className="sr-only">
          Type to find a setting. Press Enter to open the first result.
        </span>
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {searching ? (
        <div className="hidden lg:block">
          <p className="mb-1.5 px-2.5 text-xs text-foreground-dim" aria-live="polite">
            {results.length ? `${results.length} result${results.length === 1 ? "" : "s"}` : "No settings match"}
          </p>
          {results.length ? (
            <ul id="settings-search-results" ref={resultsRef} onKeyDown={onResultsKey} className="settings-search-results space-y-0.5">
              {results.map((r, i) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    onClick={(e) => {
                      e.preventDefault();
                      go(r.href);
                    }}
                    className="group flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[13px] outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">{r.label}</span>
                      <span className="block text-xs text-muted-foreground">{r.page}</span>
                    </span>
                    {i === 0 ? <CornerDownLeft className="size-3.5 shrink-0 text-foreground-dim" aria-hidden="true" /> : <ArrowRight className="size-3.5 shrink-0 text-foreground-dim opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2.5 text-xs leading-relaxed text-muted-foreground">Try “password”, “invite”, “invoices” or “currency”.</p>
          )}
        </div>
      ) : null}

      <div
        ref={trackRef}
        className={cn(
          "settings-tabs relative flex snap-x snap-mandatory items-center gap-1 overflow-x-auto border-b border-border/80 px-4 pb-px sm:px-6 lg:snap-none lg:flex-col lg:items-stretch lg:gap-0 lg:overflow-visible lg:border-0 lg:p-0",
          searching && "lg:hidden",
        )}
      >
        <GlideIndicator ref={pill} className="settings-nav-pill hidden lg:block" />
        <GlideIndicator ref={bar} className="glide-indicator--bar lg:hidden" />
        <NavGroup label="Account" items={ACCOUNT_NAV} pathname={pathname} meta={m} />
        <span aria-hidden="true" className="mx-1.5 size-1 shrink-0 rounded-full bg-border-strong lg:hidden" />
        <NavGroup label="Workspace" sublabel={workspaceName} items={WORKSPACE_NAV} pathname={pathname} meta={m} className="lg:mt-5" />
      </div>
    </nav>
  );
}

function NavGroup({ label, sublabel, items, pathname, meta, className }: { label: string; sublabel?: string | null; items: SettingsNavItem[]; pathname: string; meta: SettingsNavMetaView; className?: string }) {
  const id = `settings-nav-${label.toLowerCase()}`;
  return (
    <div role="group" aria-labelledby={id} className={cn("flex shrink-0 items-center gap-1 lg:block", className)}>
      <p id={id} className="sr-only lg:not-sr-only lg:mb-1 lg:block lg:px-2.5 lg:text-xs lg:font-medium lg:text-foreground-dim">
        {label}
      </p>
      {sublabel ? (
        <p className="hidden lg:-mt-0.5 lg:mb-1.5 lg:block lg:truncate lg:px-2.5 lg:text-[13px] lg:font-medium lg:text-foreground/85" title={sublabel}>
          {sublabel}
        </p>
      ) : null}
      <ul className="flex items-center gap-1 lg:flex-col lg:items-stretch lg:gap-0.5">
        {items.map((it) => (
          <li key={it.href} className="shrink-0">
            <NavLink it={it} active={isActive(pathname, it)} meta={meta} />
          </li>
        ))}
      </ul>
    </div>
  );
}
