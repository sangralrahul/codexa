"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Kbd } from "@/components/ui/misc";
import { openCommandMenu } from "./events";

export { SHORTCUTS_EVENT, openShortcuts } from "./events";

/** Navigation chords (G then a letter). */
export const GO_TO = { h: "/dashboard", p: "/projects", t: "/dashboard/templates", s: "/settings" } as const;

type Shortcut = { keys: string[]; label: string; mod?: boolean; then?: boolean };
export const SHORTCUT_GROUPS: { title: string; items: Shortcut[] }[] = [
  {
    title: "Anywhere",
    items: [
      { keys: ["K"], mod: true, label: "Search or run a command" },
      { keys: ["N"], label: "New project" },
      { keys: ["/"], label: "Search this page (or open the command menu)" },
      { keys: ["["], label: "Collapse or expand the sidebar" },
      { keys: ["?"], label: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Go to",
    items: [
      { keys: ["G", "H"], then: true, label: "Home" },
      { keys: ["G", "P"], then: true, label: "Projects" },
      { keys: ["G", "T"], then: true, label: "Templates" },
      { keys: ["G", "S"], then: true, label: "Settings" },
    ],
  },
  {
    title: "Composer and lists",
    items: [
      { keys: ["↵"], mod: true, label: "Build from the dashboard composer" },
      { keys: ["↑", "↓"], label: "Move through the projects table" },
      { keys: ["↵"], label: "Open the highlighted project" },
    ],
  },
];

/** Keys to show next to a destination in tooltips ("G H"). */
export function KeyHint({ keys, mod, className }: { keys: string[]; mod?: boolean; className?: string }) {
  return (
    <span className={className ? `inline-flex items-center gap-1 ${className}` : "inline-flex items-center gap-1"}>
      {keys.map((k, i) => (
        <Kbd key={`${k}-${i}`} mod={mod && i === 0} className="h-[18px] min-w-[18px] border border-border bg-muted px-1 text-[10.5px]">
          {k}
        </Kbd>
      ))}
    </span>
  );
}

function isTypingTarget(el: EventTarget | null) {
  const node = el as HTMLElement | null;
  if (!node || typeof node.closest !== "function") return false;
  return Boolean(node.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="combobox"], [role="textbox"]'));
}

/** Something modal is open (a dialog, menu, popover or the launch overlay): leave the keys to it. */
function overlayOpen() {
  return Boolean(document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [role="alertdialog"], .launch-overlay'));
}

/**
 * App-wide single-key shortcuts (Linear-style). Ignored while typing, while an overlay is open,
 * and with any modifier held. "G" starts a chord that waits 1.2s for H / P / T.
 */
export function useAppHotkeys({ enabled, canCreate, onToggleSidebar, onShortcuts }: { enabled: boolean; canCreate: boolean; onToggleSidebar: () => void; onShortcuts: () => void }) {
  const router = useRouter();
  const handlers = useRef({ onToggleSidebar, onShortcuts, canCreate });
  useEffect(() => {
    handlers.current = { onToggleSidebar, onShortcuts, canCreate };
  });

  useEffect(() => {
    if (!enabled) return;
    let chordAt = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      if (isTypingTarget(e.target) || overlayOpen()) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (chordAt && Date.now() - chordAt < 1200) {
        chordAt = 0;
        const dest = GO_TO[key as keyof typeof GO_TO];
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
        return;
      }
      chordAt = 0;
      if (key === "g") {
        chordAt = Date.now();
        return;
      }
      if (key === "n" && !e.shiftKey) {
        if (!handlers.current.canCreate) return;
        e.preventDefault();
        router.push("/new-project");
      } else if (key === "/") {
        e.preventDefault();
        const search = document.querySelector<HTMLElement>("[data-hotkey-search]");
        if (search && !search.hasAttribute("disabled")) {
          search.focus();
          if (search instanceof HTMLInputElement) search.select();
        } else openCommandMenu();
      } else if (key === "[") {
        e.preventDefault();
        handlers.current.onToggleSidebar();
      } else if (key === "?") {
        e.preventDefault();
        handlers.current.onShortcuts();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, router]);
}

/** The "?" sheet listing every shortcut. */
export function ShortcutsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Keyboard shortcuts" description="Single keys work anywhere outside a text field." width={400}>
        <div className="space-y-6">
          {SHORTCUT_GROUPS.map((g) => (
            <section key={g.title} aria-labelledby={`sc-${g.title}`}>
              <h3 id={`sc-${g.title}`} className="text-[13px] font-semibold">
                {g.title}
              </h3>
              <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-surface/50">
                {g.items.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-4 px-3 py-2.5 text-[13px]">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k, i) => (
                        <span key={`${k}-${i}`} className="flex items-center gap-1">
                          {i > 0 ? <span className="text-[11px] text-muted-foreground">{s.then ? "then" : ""}</span> : null}
                          <Kbd mod={s.mod && i === 0} className="h-6 min-w-6 border border-border bg-card px-1.5 text-xs text-foreground shadow-[inset_0_-1px_0_var(--border)]">
                            {k}
                          </Kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
