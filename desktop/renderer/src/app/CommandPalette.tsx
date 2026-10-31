import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CornerDownLeft, FolderKanban, Globe, Home, LayoutTemplate, Moon, Plus, Search, Settings } from "lucide-react";
import { cn } from "../lib/util";
import { Kbd } from "../ui";
import { useApp } from "./state";
import { applyTheme, isDark } from "./theme";
import { ProjectThumb } from "../components/ProjectThumb";

type Item = { id: string; label: string; hint?: string; icon: React.ReactNode; run: () => void; group: string };

/** Ctrl+K: jump to any project or screen, or run a command. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useApp();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const projects = (app.projects ?? []).map<Item>((p) => ({
      id: `p:${p.id}`,
      group: "Recent projects",
      label: p.name,
      hint: p.description || undefined,
      icon: <ProjectThumb templateId={p.templateId} name={p.name} className="h-[18px] w-[28px] rounded-[4px]" />,
      run: () => app.go({ name: "project", id: p.id }),
    }));
    const commands: Item[] = [
      { id: "new", group: "Commands", label: "New project", icon: <Plus />, run: () => (app.go({ name: "home" }), setTimeout(() => document.getElementById("composer")?.focus(), 50)) },
      { id: "home", group: "Commands", label: "Go to Home", icon: <Home />, run: () => app.go({ name: "home" }) },
      { id: "projects", group: "Commands", label: "Go to Projects", icon: <FolderKanban />, run: () => app.go({ name: "projects" }) },
      { id: "templates", group: "Commands", label: "Browse templates", icon: <LayoutTemplate />, run: () => app.go({ name: "templates" }) },
      { id: "settings", group: "Commands", label: "Open settings", icon: <Settings />, run: () => app.go({ name: "settings" }) },
      { id: "theme", group: "Commands", label: "Toggle dark mode", icon: <Moon />, run: () => void applyTheme(isDark() ? "light" : "dark") },
      { id: "web", group: "Commands", label: "Open Codexa on the web", icon: <Globe />, run: () => void window.codexa.openWeb("/dashboard") },
    ];
    const needle = q.trim().toLowerCase();
    const all = [...projects, ...commands];
    return needle ? all.filter((i) => i.label.toLowerCase().includes(needle) || i.hint?.toLowerCase().includes(needle)) : [...projects.slice(0, 6), ...commands];
  }, [app, q]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the palette each time it opens
    setQ("");
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;
  const run = (i: Item | undefined) => {
    if (!i) return;
    onClose();
    i.run();
  };
  let lastGroup = "";

  return createPortal(
    <div className="fixed inset-0 z-[150] flex justify-center bg-black/60 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label="Command palette" className="fade-in h-fit w-[600px] max-w-[92vw] overflow-hidden rounded-[10px] border border-border-strong bg-card">
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-4 text-dim" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(items.length - 1, a + 1)));
              else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
              else if (e.key === "Enter") (e.preventDefault(), run(items[active]));
            }}
            placeholder="Search projects or type a command…"
            aria-label="Search"
            className="h-12 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-dim focus-visible:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul className="scroll max-h-[380px] p-1.5">
          {items.length === 0 ? <li className="px-3 py-8 text-center text-[13px] text-muted">No matches.</li> : null}
          {items.map((i, idx) => {
            const header = i.group !== lastGroup ? i.group : null;
            lastGroup = i.group;
            return (
              <li key={i.id}>
                {header ? <p className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-dim">{header}</p> : null}
                <button
                  type="button"
                  onMouseMove={() => setActive(idx)}
                  onClick={() => run(i)}
                  className={cn("flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[13.5px] [&_svg]:size-4 [&_svg]:text-muted", idx === active ? "bg-surface" : "")}
                >
                  <span className="flex w-7 shrink-0 justify-center">{i.icon}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {i.label}
                    {i.hint ? <span className="ml-2 text-[12.5px] text-dim">{i.hint}</span> : null}
                  </span>
                  {idx === active ? <CornerDownLeft className="size-3.5 text-dim" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex h-9 items-center gap-4 border-t border-border bg-surface/60 px-4 text-[11.5px] text-dim">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> open
          </span>
          <span className="ml-auto">{app.projects ? `${app.projects.length} projects` : ""}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
