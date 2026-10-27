"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as RD } from "radix-ui";
import { BookOpen, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchTrigger } from "@/components/search/search-dialog";
import { categoryIcon } from "./doc-icons";

export type SidebarGroup = { category: string; items: { title: string; href: string }[] };

function NavList({ groups, onNavigate }: { groups: SidebarGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="space-y-7">
      {groups.map((g) => {
        const Icon = categoryIcon(g.category);
        return (
          <div key={g.category}>
            <p className="text-label mb-2.5 flex items-center gap-2 px-2.5 text-foreground-dim">
              <Icon className="size-3.5" aria-hidden="true" />
              {g.category}
            </p>
            <ul className="relative space-y-px before:absolute before:inset-y-1 before:left-[11px] before:w-px before:bg-border">
              {g.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center rounded-lg py-1.5 pl-7 pr-2.5 text-[14px] transition-colors duration-(--dur-2)",
                        "before:absolute before:left-[10px] before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-signal before:opacity-0 before:transition-opacity",
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                        active ? "bg-surface-2 font-medium text-foreground before:opacity-100" : "text-muted-foreground hover:bg-surface hover:text-foreground",
                      )}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** Pages that already lead with a large search field of their own (the rail's trigger would be a second one). */
const HERO_SEARCH_PATHS = new Set(["/docs"]);

/**
 * Docs navigation: a sticky rail on large screens and a Radix Dialog drawer
 * on small ones. Active state comes from the current pathname (aria-current="page"),
 * marked with a signal bar; category headers carry their icon.
 * The search trigger is labelled for the hub it sits in ("Search docs…" / "Search Learn…"), spans
 * the rail's full width (same as the nav rows), and is left out where the page has a hero search.
 */
export function DocsSidebar({ groups }: { groups: SidebarGroup[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const current = groups.flatMap((g) => g.items).find((i) => i.href === pathname);
  const currentGroup = groups.find((g) => g.items.some((i) => i.href === pathname));
  const showSearch = !HERO_SEARCH_PATHS.has(pathname ?? "");
  const searchLabel = groups.some((g) => g.category === "Learn") ? "Search Learn…" : "Search docs…";

  return (
    <>
      {/* Mobile bar */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-border bg-background/92 px-4 py-2 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <RD.Root open={open} onOpenChange={setOpen}>
            <RD.Trigger asChild>
              <button type="button" className="inline-flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted" aria-label="Open documentation menu">
                <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {currentGroup ? (
                  <>
                    <span className="hidden truncate text-muted-foreground xs:inline">{currentGroup.category}</span>
                    <ChevronRight className="hidden size-3.5 shrink-0 text-foreground-dim xs:block" aria-hidden="true" />
                  </>
                ) : null}
                <span className="truncate">{current?.title ?? "Documentation"}</span>
              </button>
            </RD.Trigger>
            <RD.Portal>
              <RD.Overlay className="cx-overlay fixed inset-0 z-50 bg-background/50 backdrop-blur-[3px]" />
              <RD.Content
                data-side="left"
                className="cx-sheet e2 fixed inset-y-2 left-2 z-50 flex w-[min(20rem,calc(100%-2.5rem))] flex-col overflow-hidden rounded-[18px] focus:outline-none"
                aria-describedby={undefined}
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <RD.Title className="text-sm font-semibold">Documentation</RD.Title>
                  <RD.Close className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close menu">
                    <X className="size-4" />
                  </RD.Close>
                </div>
                <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
                  <NavList groups={groups} onNavigate={() => setOpen(false)} />
                </div>
              </RD.Content>
            </RD.Portal>
          </RD.Root>
          {showSearch ? <SearchTrigger label={searchLabel} /> : null}
        </div>
      </div>

      {/* Desktop rail */}
      <aside className="hidden lg:block">
        <div className="scrollbar-thin sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-8 pr-3">
          {showSearch ? (
            <div className="mb-6">
              <SearchTrigger label={searchLabel} className="w-full sm:w-full sm:min-w-0" />
            </div>
          ) : null}
          <NavList groups={groups} />
        </div>
      </aside>
    </>
  );
}
