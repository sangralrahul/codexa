"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { NAV } from "@/config/routes";
import { buttonClasses } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SearchTrigger } from "@/components/search/search-dialog";
import { cn } from "@/lib/utils";

type Item = { label: string; href: string; description?: string };
const groups: { key: string; label: string; items: readonly Item[] }[] = [
  { key: "product", label: "Product", items: NAV.product },
  { key: "solutions", label: "Solutions", items: NAV.solutions },
  { key: "resources", label: "Resources", items: NAV.resources },
  { key: "company", label: "Company", items: NAV.company },
];

function DesktopMenu({
  group,
  active,
}: {
  group: (typeof groups)[number];
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground",
          (open || active) && "text-foreground",
        )}
      >
        {group.label}
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      <div
        id={id}
        role="menu"
        aria-label={group.label}
        hidden={!open}
        className="absolute left-0 top-full z-40 w-72 pt-2"
      >
        <div className="glass rounded-2xl border border-border p-2 shadow-lg animate-fade-in">
          {group.items.map((item) => (
            <Link
              key={item.href}
              role="menuitem"
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm hover:bg-muted focus-visible:bg-muted"
            >
              <span className="font-medium text-foreground">{item.label}</span>
              {item.description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {item.description}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MarketingHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    // Close the mobile menu on navigation (state adjustment during render).
    setLastPath(pathname);
    setMobileOpen(false);
  }
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (items: readonly Item[]) =>
    items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));

  return (
    <header className="sticky top-0 z-50">
      {/* The blur lives on an inner bar: backdrop-filter would otherwise make the header the containing block for the fixed mobile panel. */}
      <div
        className={cn(
          "relative border-b transition-[background-color,border-color,box-shadow] duration-300",
          scrolled || mobileOpen ? "glass border-border shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]" : "border-transparent bg-transparent",
        )}
      >
        {/* Gradient hairline that fades in once the page scrolls. */}
        <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-glow-2/60 to-transparent transition-opacity duration-300", scrolled ? "opacity-100" : "opacity-0")} />
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo />
            <nav aria-label="Main" className="hidden items-center lg:flex">
              {groups.map((g) => (
                <DesktopMenu key={g.key} group={g} active={isActive(g.items)} />
              ))}
              <Link
                href="/pricing"
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
                  pathname.startsWith("/pricing") && "text-foreground",
                )}
              >
                Pricing
              </Link>
              <Link
                href="/docs"
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
                  pathname.startsWith("/docs") && "text-foreground",
                )}
              >
                Docs
              </Link>
            </nav>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <SearchTrigger className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" />
            <ThemeToggle />
            {signedIn ? (
              <Link
                href="/dashboard"
                className={buttonClasses("primary", "sm")}
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClasses("ghost", "sm")}>
                  Sign In
                </Link>
                <Link href="/signup" className={cn(buttonClasses("primary", "sm"), "btn-glow rounded-lg")}>
                  Start Building Free
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>
      {mobileOpen ? (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-border bg-background lg:hidden"
        >
          <nav aria-label="Mobile" className="container-x py-4">
            {groups.map((g) => (
              <details
                key={g.key}
                className="group border-b border-border py-2"
                open={isActive(g.items)}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-base font-medium">
                  {g.label}
                  <ChevronDown
                    className="size-4 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <ul className="pb-2">
                  {g.items.map((i) => (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        className="block rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {i.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            <Link
              href="/pricing"
              className="block border-b border-border py-4 text-base font-medium"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="block border-b border-border py-4 text-base font-medium"
            >
              Docs
            </Link>
            <div className="mt-4 flex flex-col gap-2">
              {signedIn ? (
                <Link
                  href="/dashboard"
                  className={buttonClasses("primary", "lg")}
                >
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className={cn(buttonClasses("primary", "lg"), "btn-glow rounded-xl")}
                  >
                    Start Building Free
                  </Link>
                  <Link
                    href="/login"
                    className={buttonClasses("outline", "lg")}
                  >
                    Sign In
                  </Link>
                </>
              )}
              <div className="mt-2 flex items-center justify-center gap-3">
                <SearchTrigger className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground" />
                <ThemeToggle />
              </div>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
