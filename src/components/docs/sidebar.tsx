"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as RD } from "radix-ui";
import { BookOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchTrigger } from "@/components/search/search-dialog";

export type SidebarGroup = { category: string; items: { title: string; href: string }[] };

function NavList({ groups, onNavigate }: { groups: SidebarGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="space-y-6">
      {groups.map((g) => (
        <div key={g.category}>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.category}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm transition",
                      active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Docs navigation: a sticky rail on large screens and a Radix Dialog drawer
 * on small ones. Active state comes from the current pathname.
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

  return (
    <>
      {/* Mobile bar */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <RD.Root open={open} onOpenChange={setOpen}>
            <RD.Trigger asChild>
              <button type="button" className="inline-flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted" aria-label="Open documentation menu">
                <BookOpen className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{current?.title ?? "Documentation"}</span>
              </button>
            </RD.Trigger>
            <RD.Portal>
              <RD.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-fade-in" />
              <RD.Content
                className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100%-2.5rem))] flex-col bg-surface shadow-lg focus:outline-none data-[state=open]:animate-fade-in"
                aria-describedby={undefined}
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <RD.Title className="text-sm font-semibold">Documentation</RD.Title>
                  <RD.Close className="rounded-md p-1.5 hover:bg-muted" aria-label="Close menu">
                    <X className="size-4" />
                  </RD.Close>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <NavList groups={groups} onNavigate={() => setOpen(false)} />
                </div>
              </RD.Content>
            </RD.Portal>
          </RD.Root>
          <SearchTrigger />
        </div>
      </div>

      {/* Desktop rail */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-3 scrollbar-thin">
          <div className="mb-4">
            <SearchTrigger className="w-full" />
          </div>
          <NavList groups={groups} />
        </div>
      </aside>
    </>
  );
}
