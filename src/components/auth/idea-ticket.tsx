"use client";

import * as React from "react";
import { Check, LayoutTemplate, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/input";
import { IDEA_MAX, clampIdea } from "@/lib/client/pending-idea";
import { cn } from "@/lib/utils";

/**
 * The idea passport on sign-up (PLAN §4.1): the sentence typed on the homepage, quoted on a
 * comet-border ticket. Long ideas clamp to two lines and expand on click; "Edit" turns the
 * ticket into a textarea right here (no round trip to the homepage). Text only: the prompt
 * is rendered as a React text node, never as HTML.
 */
export function IdeaTicket({ text, onChange, templateName }: { text: string; onChange: (text: string) => void; templateName?: string }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(text);
  const [expanded, setExpanded] = React.useState(false);
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const editRef = React.useRef<HTMLButtonElement>(null);
  const quoteRef = React.useRef<HTMLParagraphElement>(null);
  // Whether the quote is actually cut by the two-line clamp at the current width (measured, so a
  // 90-character idea on a phone gets "Show all" too). Text-length heuristic until measured.
  const [clamped, setClamped] = React.useState(text.length > 110 || text.includes("\n"));
  const textId = React.useId();

  React.useEffect(() => {
    const el = quoteRef.current;
    if (!el || expanded || editing) return;
    if (typeof ResizeObserver === "undefined") return;
    // The observer reports once as soon as it starts, then on every width change.
    const ro = new ResizeObserver(() => setClamped(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, expanded, editing]);
  const long = clamped || expanded;

  const startEdit = () => {
    setDraft(text);
    setEditing(true);
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };
  const commit = () => {
    const next = clampIdea(draft);
    if (next) onChange(next);
    setEditing(false);
    requestAnimationFrame(() => editRef.current?.focus());
  };

  return (
    <div suppressHydrationWarning className="comet-border idea-ticket rounded-[18px] shadow-md" data-active="">
      <div className="comet-border__inner overflow-hidden rounded-[17px] px-3.5 pb-3.5 pt-3 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-label flex min-w-0 items-center gap-2 whitespace-nowrap text-signal-ink">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
            Your idea · carried over
          </p>
          {editing ? (
            <button
              type="button"
              onClick={commit}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-foreground px-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              <Check className="size-3.5" aria-hidden="true" /> Done
            </button>
          ) : (
            <button
              ref={editRef}
              type="button"
              onClick={startEdit}
              className="-mr-1.5 inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3" aria-hidden="true" /> Edit
            </button>
          )}
        </div>
        {editing ? (
          <Textarea
            ref={areaRef}
            aria-label="Edit your idea"
            value={draft}
            maxLength={IDEA_MAX}
            autoGrow={{ minRows: 2, maxRows: 7 }}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
                requestAnimationFrame(() => editRef.current?.focus());
              }
            }}
            className="mt-2.5 text-[15px]"
          />
        ) : (
          <>
            <p
              ref={quoteRef}
              id={textId}
              data-expanded={expanded ? "" : undefined}
              // A click anywhere on a cut-off quote opens it in full (the "Show all" button is the keyboard path).
              onClick={long && !expanded ? () => setExpanded(true) : undefined}
              className={cn("idea-ticket__text mt-2 whitespace-pre-line text-pretty text-[15px] leading-6 text-foreground", long && !expanded && "cursor-pointer")}
            >
              <span aria-hidden="true" className="text-muted-foreground">“</span>
              {text}
              <span aria-hidden="true" className="text-muted-foreground">”</span>
            </p>
            {long ? (
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={textId}
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {expanded ? "Show less" : "Show all"}
              </button>
            ) : null}
          </>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
          <span className="whitespace-nowrap">Setup opens with this filled in.</span>
          {templateName ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <LayoutTemplate className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Closest starter: <span className="text-foreground">{templateName}</span>
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
