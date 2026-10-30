"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  ChevronDown,
  Code2,
  Compass,
  GraduationCap,
  Info,
  LayoutTemplate,
  Lightbulb,
  Mail,
  Menu,
  Newspaper,
  Plug,
  Rocket,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { NAV, type NavItem } from "@/config/routes";
import { buttonClasses } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MotionToggle } from "@/components/motion/motion-toggle";
import { GlideIndicator, useGlide } from "@/components/motion/glide";
import { SearchDialog, openSearch } from "@/components/search/search-dialog";
import { usePlatformMod } from "@/lib/client/platform";
import { cn } from "@/lib/utils";

type GroupKey = keyof typeof NAV;
type Group = { key: GroupKey; label: string; items: readonly NavItem[]; footer: { label: string; href: string }[] };

const GROUPS: Group[] = [
  { key: "product", label: "Product", items: NAV.product, footer: [{ label: "All features", href: "/features" }, { label: "How it works", href: "/how-it-works" }] },
  { key: "solutions", label: "Solutions", items: NAV.solutions, footer: [{ label: "All solutions", href: "/solutions" }, { label: "Templates", href: "/templates" }] },
  { key: "resources", label: "Resources", items: NAV.resources, footer: [{ label: "Learn hub", href: "/learn" }, { label: "Help center", href: "/help" }] },
  { key: "company", label: "Company", items: NAV.company, footer: [{ label: "Mission", href: "/mission" }, { label: "Trust center", href: "/trust-center" }] },
];
const LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
];

const ICONS: Record<string, LucideIcon> = {
  "/ai-app-builder": Sparkles,
  "/ai-agent": Bot,
  "/code-editor": Code2,
  "/app-deployment": Rocket,
  "/integrations": Plug,
  "/solutions/startups": Rocket,
  "/solutions/founders": Lightbulb,
  "/solutions/developers": Terminal,
  "/solutions/students": GraduationCap,
  "/solutions/agencies": Briefcase,
  "/solutions/enterprise": Building2,
  "/docs": BookOpen,
  "/templates": LayoutTemplate,
  "/guides": Compass,
  "/changelog": ScrollText,
  "/blog": Newspaper,
  "/community": Users,
  "/about": Info,
  "/security": ShieldCheck,
  "/status": Activity,
  "/careers": Briefcase,
  "/contact": Mail,
};

const OPEN_DELAY = 100;
const CLOSE_GRACE = 200;

/** Idle nav text: muted on the plain bar, foreground on hover. */
const TRIGGER_IDLE = "text-muted-foreground hover:text-foreground";

const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

/** Platform-aware "Search ⌘K" pill. Opens the site search (the dialog is mounted once in the header). */
function SearchPill({ className, iconOnlyBelow = "xl" }: { className?: string; iconOnlyBelow?: "xl" | "never" }) {
  const mod = usePlatformMod();
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-keyshortcuts={mod === "⌘" ? "Meta+K" : "Control+K"}
      data-no-ripple
      className={cn(
        "group inline-flex h-8 shrink-0 items-center gap-2 rounded-[8px] border border-border bg-surface text-[13px] text-muted-foreground transition-[color,border-color,background-color] duration-200 hover:border-border-strong hover:text-foreground",
        iconOnlyBelow === "xl" ? "w-8 justify-center xl:w-auto xl:justify-start xl:pl-2.5 xl:pr-1.5" : "pl-3 pr-1.5",
        className,
      )}
    >
      <Search className="size-4" aria-hidden="true" />
      {/* Named from content (not aria-label) so the visible "Search" and the shortcut hint never disagree with the name. */}
      <span className="sr-only">Search documentation</span>
      <span aria-hidden="true" className={cn(iconOnlyBelow === "xl" && "hidden xl:inline")}>Search</span>
      <Kbd mod aria-hidden="true" className={cn("ml-1 border-0 bg-muted px-1.5 shadow-[inset_0_0_0_1px_var(--border)]", iconOnlyBelow === "xl" && "hidden xl:inline-flex")}>
        K
      </Kbd>
    </button>
  );
}

export function MarketingHeader({ signedIn, wells }: { signedIn: boolean; wells?: Partial<Record<string, React.ReactNode>> }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState<GroupKey | null>(null);
  const [focusItem, setFocusItem] = React.useState<Record<GroupKey, number>>({ product: 0, solutions: 0, resources: 0, company: 0 });
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  /** Set the first time a visitor reaches for a menu; until then the wells' screenshots are not fetched. */
  const [armed, setArmed] = React.useState(false);
  const arm = () => setArmed(true);
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    // Route changed: close every menu (state adjustment during render).
    setLastPath(pathname);
    setOpen(null);
    setMobileOpen(false);
  }

  const headerRef = React.useRef<HTMLElement>(null);
  const sentinelRef = React.useRef<HTMLSpanElement>(null);
  const navRef = React.useRef<HTMLDivElement>(null);
  const triggerRefs = React.useRef<Partial<Record<GroupKey, HTMLButtonElement | null>>>({});
  const panelRefs = React.useRef<Partial<Record<GroupKey, HTMLDivElement | null>>>({});
  const bgRef = React.useRef<HTMLDivElement>(null);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  /** How the open menu was opened: a click right after a hover-open should not close it again. */
  const openedBy = React.useRef<"hover" | "click">("click");
  const glide = useGlide(navRef, { hover: true, selector: '[data-active="true"]', itemSelector: "[data-nav-trigger]" });

  // Condense into the capsule once the page has scrolled 24px (sentinel, no scroll listener).
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Mobile sheet: lock the page behind it and take it out of the tab order (inert), so keyboard and
  // screen-reader users stay in the sheet; Escape closes it and returns focus to the toggle.
  React.useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const shell = headerRef.current?.closest(".site-shell");
    const behind = shell ? Array.from(shell.children).filter((el): el is HTMLElement => el instanceof HTMLElement && (el.tagName === "MAIN" || el.tagName === "FOOTER")) : [];
    for (const el of behind) el.inert = true;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    // The sheet is phones and tablets only: widening the window past lg closes it (and un-inerts the page).
    const wide = window.matchMedia("(min-width: 64rem)");
    const onWide = () => wide.matches && setMobileOpen(false);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = prev;
      for (const el of behind) el.inert = false;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [mobileOpen]);

  // Mega menus: Escape closes (focus back on the trigger), a press outside the header closes.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = triggerRefs.current[open];
      setOpen(null);
      t?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // The shared panel background takes the height of the open panel.
  React.useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRefs.current[open];
    const bg = bgRef.current;
    if (!panel || !bg) return;
    const sync = () => bg.style.setProperty("--mk-h", `${panel.offsetHeight}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(panel);
    return () => ro.disconnect();
  }, [open]);

  React.useEffect(
    () => () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = closeTimer.current = null;
  };
  const hoverOpen = (key: GroupKey) => {
    clearTimers();
    // Moving between triggers while a menu is open switches immediately; otherwise wait for intent.
    openedBy.current = "hover";
    if (open) setOpen(key);
    else openTimer.current = setTimeout(() => setOpen(key), OPEN_DELAY);
  };
  const scheduleClose = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), CLOSE_GRACE);
  };
  const keepOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const openIndex = open ? GROUPS.findIndex((g) => g.key === open) : -1;

  return (
    <>
      {/* 24px below the top of the page: once it leaves the viewport the bar condenses. */}
      <span ref={sentinelRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-6 h-px w-px" />
      <header
        ref={headerRef}
        className="group/hdr mk-header"
        data-scrolled={scrolled ? "" : undefined}
        data-mega={open ? "" : undefined}
        data-sheet={mobileOpen ? "" : undefined}
        data-armed={armed || open ? "" : undefined}
      >
        <div className="mk-bar container-x">
          <div className="relative flex h-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4 xl:gap-6">
              <Logo />
              <nav
                aria-label="Main"
                className="hidden lg:block"
                onPointerLeave={scheduleClose}
                onPointerEnter={() => {
                  keepOpen();
                  arm();
                }}
                onFocus={arm}
              >
                <div ref={navRef} className="relative">
                <GlideIndicator ref={glide} className="inset-y-0 rounded-[8px] bg-foreground/[0.06] shadow-none" />
                <ul className="flex items-center">
                  {GROUPS.map((g, gi) => {
                    const expanded = open === g.key;
                    const current = g.items.some((i) => isActivePath(pathname, i.href));
                    const panelId = `mega-${g.key}`;
                    return (
                      <li
                        key={g.key}
                        onBlur={(e) => {
                          if (expanded && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(null);
                        }}
                      >
                        <button
                          ref={(el) => {
                            triggerRefs.current[g.key] = el;
                          }}
                          type="button"
                          data-nav-trigger
                          data-active={expanded ? "true" : undefined}
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          data-no-ripple
                          onPointerEnter={(e) => e.pointerType !== "touch" && hoverOpen(g.key)}
                          onClick={() => {
                            clearTimers();
                            if (open === g.key && openedBy.current === "hover") {
                              // Opened by hovering a moment ago: the click confirms it rather than closing it.
                              openedBy.current = "click";
                              return;
                            }
                            openedBy.current = "click";
                            setOpen((o) => (o === g.key ? null : g.key));
                          }}
                          className={cn(
                            "relative z-[1] inline-flex h-8 items-center gap-1 rounded-[8px] px-2.5 text-[13.5px] font-medium transition-colors duration-200",
                            expanded || current ? "text-foreground" : TRIGGER_IDLE,
                          )}
                        >
                          {g.label}
                          <ChevronDown className={cn("size-3.5 opacity-60 transition-transform duration-300 ease-snap", expanded && "rotate-180")} aria-hidden="true" />
                        </button>
                        <div
                          id={panelId}
                          ref={(el) => {
                            panelRefs.current[g.key] = el;
                          }}
                          className="mk-mega"
                          data-open={expanded ? "" : undefined}
                          style={{ "--mk-shift": openIndex < 0 || expanded ? "0px" : gi < openIndex ? "-18px" : "18px" } as React.CSSProperties}
                          onPointerEnter={keepOpen}
                        >
                          <div className="grid grid-cols-[minmax(0,1fr)_260px] gap-2 p-2">
                            <ul className="flex flex-col">
                              {g.items.map((item, ii) => {
                                const Icon = ICONS[item.href] ?? ArrowRight;
                                const on = focusItem[g.key] === ii;
                                return (
                                  <li key={item.href}>
                                    <Link
                                      href={item.href}
                                      aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                                      onPointerEnter={() => setFocusItem((f) => ({ ...f, [g.key]: ii }))}
                                      onFocus={() => setFocusItem((f) => ({ ...f, [g.key]: ii }))}
                                      onClick={() => setOpen(null)}
                                      data-on={on ? "" : undefined}
                                      className="group/item flex items-start gap-3 rounded-[8px] px-3 py-2.5 outline-offset-[-2px] transition-colors duration-150 data-[on]:bg-foreground/[0.05]"
                                    >
                                      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors duration-150 group-data-[on]/item:text-primary" aria-hidden="true" />
                                      <span className="min-w-0">
                                        <span className="flex items-center gap-1.5 text-[14px] font-medium text-foreground">
                                          {item.label}
                                          <ArrowRight className="size-3 -translate-x-1 opacity-0 transition-[translate,opacity] duration-200 group-data-[on]/item:translate-x-0 group-data-[on]/item:opacity-60" aria-hidden="true" />
                                        </span>
                                        <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{item.description}</span>
                                      </span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                            <div className="flex flex-col gap-2">
                              <div aria-hidden="true" className="mk-wells">
                                {g.items.map((item, ii) => (
                                  <div key={item.href} className="mk-well" data-on={focusItem[g.key] === ii && expanded ? "" : undefined}>
                                    {wells?.[item.href] ?? null}
                                  </div>
                                ))}
                              </div>
                              <div className="mt-auto flex flex-wrap gap-1 px-1 pb-1">
                                {g.footer.map((f) => (
                                  <Link
                                    key={f.href}
                                    href={f.href}
                                    onClick={() => setOpen(null)}
                                    className="inline-flex h-7 items-center gap-1 rounded-[6px] px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                                  >
                                    {f.label}
                                    <ArrowRight className="size-3" aria-hidden="true" />
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {LINKS.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        data-nav-trigger
                        aria-current={isActivePath(pathname, l.href) ? "page" : undefined}
                        onPointerEnter={() => {
                          clearTimers();
                          if (open) closeTimer.current = setTimeout(() => setOpen(null), CLOSE_GRACE);
                        }}
                        className={cn(
                          "relative z-[1] inline-flex h-8 items-center rounded-[8px] px-2.5 text-[13.5px] font-medium transition-colors duration-200",
                          isActivePath(pathname, l.href) ? "text-foreground" : TRIGGER_IDLE,
                        )}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                </div>
                <div ref={bgRef} aria-hidden="true" className="mk-mega-bg" />
              </nav>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <SearchPill />
              {signedIn ? (
                <Link href="/dashboard" className={buttonClasses("primary", "sm", "ml-1 h-8 px-3.5", "app")}>
                  Open dashboard
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link href="/login" className={buttonClasses("ghost", "sm", cn("h-8 px-3", TRIGGER_IDLE), "app")}>
                    Sign in
                  </Link>
                  <Link href="/signup" className={buttonClasses("primary", "sm", "h-8 px-3.5", "app")}>
                    Start building
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 lg:hidden">
              <SearchPill iconOnlyBelow="xl" className={cn("border-transparent bg-transparent shadow-none", TRIGGER_IDLE)} />
              <button
                ref={menuButtonRef}
                type="button"
                className="inline-flex size-9 items-center justify-center rounded-[8px] text-foreground transition-colors hover:bg-foreground/[0.06]"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                data-no-ripple
                onClick={() => setMobileOpen((o) => !o)}
              >
                <span className="relative size-5">
                  <Menu className={cn("absolute inset-0 size-5 transition-[opacity,rotate,scale] duration-300 ease-snap", mobileOpen ? "rotate-90 scale-75 opacity-0" : "opacity-100")} aria-hidden="true" />
                  <X className={cn("absolute inset-0 size-5 transition-[opacity,rotate,scale] duration-300 ease-snap", mobileOpen ? "opacity-100" : "-rotate-90 scale-75 opacity-0")} aria-hidden="true" />
                </span>
              </button>
            </div>
          </div>
        </div>
        <SearchDialog />
      </header>
      {mobileOpen ? <MobileSheet signedIn={signedIn} pathname={pathname} onClose={() => setMobileOpen(false)} /> : null}
    </>
  );
}

/** Full-screen mobile navigation: big rows that rise in, CTAs at the bottom, theme and motion settings. */
function MobileSheet({ signedIn, pathname, onClose }: { signedIn: boolean; pathname: string; onClose: () => void }) {
  let row = 0;
  const next = () => ({ "--i": row++ }) as React.CSSProperties;
  return (
    <div id="mobile-nav" className="mk-sheet fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-background lg:hidden">
      <nav aria-label="Mobile" className="container-x relative flex min-h-full flex-col pb-8 pt-20">
        <ul className="flex flex-col">
          {GROUPS.map((g) => (
            <li key={g.key} className="mk-sheet__row border-b border-border" style={next()}>
              <details className="group" open={g.items.some((i) => isActivePath(pathname, i.href))}>
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[18px] font-semibold tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
                  {g.label}
                  <span aria-hidden="true" className="relative inline-flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-open:border-border-strong group-open:text-foreground">
                    <span className="absolute h-px w-3 bg-current" />
                    <span className="absolute h-3 w-px bg-current transition-transform duration-300 ease-snap group-open:scale-y-0" />
                  </span>
                </summary>
                <ul className="grid gap-0.5 pb-4">
                  {g.items.map((i) => {
                    const Icon = ICONS[i.href] ?? ArrowRight;
                    return (
                      <li key={i.href}>
                        <Link
                          href={i.href}
                          onClick={onClose}
                          aria-current={isActivePath(pathname, i.href) ? "page" : undefined}
                          className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted aria-[current=page]:bg-muted"
                        >
                          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block text-[15px] font-medium">{i.label}</span>
                            <span className="block truncate text-[13px] text-muted-foreground">{i.description}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </li>
          ))}
          {LINKS.map((l) => (
            <li key={l.href} className="mk-sheet__row border-b border-border" style={next()}>
              <Link href={l.href} onClick={onClose} aria-current={isActivePath(pathname, l.href) ? "page" : undefined} className="flex items-center justify-between py-4 text-[18px] font-semibold tracking-[-0.01em]">
                {l.label}
                <ArrowRight className="size-5 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mk-sheet__row mt-auto flex flex-col gap-2.5 pt-10" style={next()}>
          {signedIn ? (
            <Link href="/dashboard" onClick={onClose} className={buttonClasses("primary", "lg", "w-full")}>
              Open dashboard
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link href="/signup" onClick={onClose} className={buttonClasses("primary", "lg", "w-full")}>
                Start building
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/login" onClick={onClose} className={buttonClasses("outline", "lg", "w-full")}>
                Sign in
              </Link>
            </>
          )}
          <SearchPill iconOnlyBelow="never" className="h-11 w-full justify-start px-4 [&>kbd]:ml-auto" />
        </div>
        <div className="mk-sheet__row mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5" style={next()}>
          <ThemeToggle />
          <MotionToggle />
        </div>
      </nav>
    </div>
  );
}
