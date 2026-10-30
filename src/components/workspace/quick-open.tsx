"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog as RD } from "radix-ui";
import { ChevronRight, CornerDownLeft, Search, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { basename, dirname, fuzzyMatch } from "@/lib/client/workspace/paths";
import type { FileEntry } from "@/lib/client/workspace/types";
import { Kbd } from "@/components/ui/misc";
import { FileIcon } from "./file-icon";

export type PaletteCommand = { id: string; label: string; hint?: string; Icon: LucideIcon; shortcut?: React.ReactNode; disabled?: boolean; run: () => void };

type Item =
  | { kind: "file"; path: string; indices: number[]; group: "Recent" | "Files" }
  | { kind: "command"; cmd: PaletteCommand; indices: number[] }
  | { kind: "ask"; text: string };

/**
 * Raycast-style palette (Ctrl/⌘ P): files with type icons, bold basename and muted folder,
 * matched characters highlighted; a Recent group; ">" switches to workspace commands with real
 * handlers; when nothing matches, "Ask Codexa: …" hands the text to the agent. Keeps the
 * combobox + listbox + aria-activedescendant pattern.
 */
export function QuickOpen({
  open,
  onOpenChange,
  files,
  recent = [],
  onPick,
  commands = [],
  startInCommands = false,
  onAsk,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  files: FileEntry[];
  recent?: string[];
  onPick: (path: string) => void;
  commands?: PaletteCommand[];
  startInCommands?: boolean;
  onAsk?: (text: string) => void;
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="cx-overlay fixed inset-0 z-50 bg-background/40 backdrop-blur-[3px]" />
        {/* The body unmounts when the dialog closes, so query/selection reset on every open. */}
        <Body
          files={files}
          recent={recent}
          commands={commands}
          startInCommands={startInCommands}
          onAsk={
            onAsk
              ? (t) => {
                  onAsk(t);
                  onOpenChange(false);
                }
              : undefined
          }
          onPick={(p) => {
            onPick(p);
            onOpenChange(false);
          }}
          onRun={(c) => {
            onOpenChange(false);
            // Let the dialog close (and return focus) before the command moves focus elsewhere.
            setTimeout(() => c.run(), 0);
          }}
        />
      </RD.Portal>
    </RD.Root>
  );
}

function Highlight({ text, indices, offset = 0 }: { text: string; indices: number[]; offset?: number }) {
  if (!indices.length) return <>{text}</>;
  const set = new Set(indices.map((i) => i - offset));
  return (
    <>
      {Array.from(text).map((ch, i) =>
        set.has(i) ? (
          <mark key={i} className="rounded-[2px] bg-transparent font-semibold text-primary">
            {ch}
          </mark>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </>
  );
}

function Body({
  files,
  recent,
  commands,
  startInCommands,
  onPick,
  onRun,
  onAsk,
}: {
  files: FileEntry[];
  recent: string[];
  commands: PaletteCommand[];
  startInCommands: boolean;
  onPick: (path: string) => void;
  onRun: (c: PaletteCommand) => void;
  onAsk?: (text: string) => void;
}) {
  const [query, setQuery] = useState(startInCommands ? ">" : "");
  const [index, setIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const commandMode = query.startsWith(">");
  const q = (commandMode ? query.slice(1) : query).trim();

  const items = useMemo<Item[]>(() => {
    if (commandMode) {
      return commands
        .map((cmd) => ({ cmd, m: fuzzyMatch(q, cmd.label) }))
        .filter((x) => x.m)
        .sort((a, b) => Number(Boolean(a.cmd.disabled)) - Number(Boolean(b.cmd.disabled)) || (q ? b.m!.score - a.m!.score : 0))
        .map((x) => ({ kind: "command" as const, cmd: x.cmd, indices: x.m!.indices }));
    }
    if (!q) {
      const known = new Set(files.map((f) => f.path));
      const rec = recent.filter((p) => known.has(p)).slice(0, 6);
      const recSet = new Set(rec);
      return [
        ...rec.map((path) => ({ kind: "file" as const, path, indices: [], group: "Recent" as const })),
        ...files
          .filter((f) => !recSet.has(f.path))
          .slice(0, 50)
          .map((f) => ({ kind: "file" as const, path: f.path, indices: [], group: "Files" as const })),
      ];
    }
    const scored = files
      .map((f) => ({ path: f.path, m: fuzzyMatch(q, f.path) }))
      .filter((r) => r.m)
      .sort((a, b) => b.m!.score - a.m!.score || a.path.localeCompare(b.path))
      .slice(0, 50)
      .map((r) => ({ kind: "file" as const, path: r.path, indices: r.m!.indices, group: "Files" as const }));
    if (!scored.length && onAsk) return [{ kind: "ask" as const, text: q }];
    return scored;
  }, [commandMode, commands, files, recent, q, onAsk]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    if (item.kind === "file") onPick(item.path);
    else if (item.kind === "command") {
      if (!item.cmd.disabled) onRun(item.cmd);
    } else onAsk?.(item.text);
  };

  return (
    <RD.Content
      className="cx-dialog e2 fixed left-1/2 top-[13vh] z-50 w-[calc(100%-1.5rem)] max-w-[640px] -translate-x-1/2 overflow-hidden rounded-2xl focus:outline-none"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setIndex((i) => Math.min(items.length - 1, i + 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setIndex((i) => Math.max(0, i - 1));
        } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          choose(items[index]);
        }
      }}
    >
      <RD.Title className="sr-only">{commandMode ? "Run a command" : "Quick open"}</RD.Title>
      <RD.Description className="sr-only">Type to filter files, or start with &gt; for commands. Use the arrow keys and Enter.</RD.Description>
      <div className="flex h-[52px] items-center gap-2.5 border-b border-border px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          placeholder={commandMode ? "Run a command…" : "Search files, > for commands"}
          aria-label={commandMode ? "Search commands" : "Search files"}
          role="combobox"
          aria-expanded="true"
          aria-controls="quick-open-results"
          aria-autocomplete="list"
          aria-activedescendant={items[index] ? `qo-${index}` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium", commandMode ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground")}>{commandMode ? "Commands" : "Files"}</span>
      </div>
      <ul id="quick-open-results" ref={listRef} role="listbox" aria-label={commandMode ? "Commands" : "Files"} className="scrollbar-thin max-h-[min(56vh,460px)] overflow-y-auto p-1.5">
        {items.length === 0 ? <li className="px-3 py-8 text-center text-sm text-muted-foreground">{commandMode ? "No matching command" : "No matching files"}</li> : null}
        {items.map((item, i) => {
          const selected = i === index;
          const prev = items[i - 1];
          const header = item.kind === "file" && (!prev || prev.kind !== "file" || prev.group !== item.group) ? item.group : null;
          const row = cn("relative flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] transition-colors duration-100", selected ? "bg-muted shadow-[inset_0_0_0_1px_var(--border)]" : "hover:bg-muted/50");
          return (
            <li key={item.kind === "file" ? `f:${item.path}` : item.kind === "command" ? `c:${item.cmd.id}` : "ask"} role="presentation">
              {header && !q ? <p className="px-2.5 pb-1 pt-2 text-[11.5px] font-medium text-muted-foreground" aria-hidden="true">{header}</p> : null}
              {item.kind === "file" ? (
                <div id={`qo-${i}`} data-index={i} role="option" aria-selected={selected} aria-label={item.path} onMouseMove={() => !selected && setIndex(i)} onClick={() => choose(item)} className={row}>
                  <FileIcon name={basename(item.path)} />
                  <span className="min-w-0 truncate">
                    <span className="font-medium">
                      <Highlight text={basename(item.path)} indices={item.indices.filter((x) => x >= item.path.length - basename(item.path).length)} offset={item.path.length - basename(item.path).length} />
                    </span>
                    {dirname(item.path) ? (
                      <span className="ml-2 font-mono text-[11.5px] text-muted-foreground">
                        <Highlight text={dirname(item.path)} indices={item.indices.filter((x) => x < dirname(item.path).length)} />
                      </span>
                    ) : null}
                  </span>
                  {selected ? <CornerDownLeft className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                </div>
              ) : item.kind === "command" ? (
                <div id={`qo-${i}`} data-index={i} role="option" aria-selected={selected} aria-disabled={item.cmd.disabled || undefined} onMouseMove={() => !selected && setIndex(i)} onClick={() => choose(item)} className={cn(row, item.cmd.disabled && "cursor-default opacity-50")}>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
                    <item.cmd.Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <Highlight text={item.cmd.label} indices={item.indices} />
                    {item.cmd.hint ? <span className="ml-2 text-[12px] text-muted-foreground">{item.cmd.hint}</span> : null}
                  </span>
                  {item.cmd.shortcut ? <span className="ml-auto shrink-0">{item.cmd.shortcut}</span> : null}
                </div>
              ) : (
                <div id={`qo-${i}`} data-index={i} role="option" aria-selected={selected} onMouseMove={() => !selected && setIndex(i)} onClick={() => choose(item)} className={row}>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    Ask Codexa: <span className="font-medium">{item.text}</span>
                  </span>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-3 border-t border-border bg-surface/60 px-4 py-2 text-[11.5px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> to move
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> to open
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Kbd>&gt;</Kbd> commands
        </span>
      </div>
    </RD.Content>
  );
}
