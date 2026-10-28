"use client";

import * as React from "react";
import { Check, MousePointerClick, RotateCcw, Sparkles, Undo2, X } from "lucide-react";
import { api } from "@/lib/client/api";
import { emit } from "@/lib/client/events";
import { filesApi } from "@/lib/client/workspace/api";
import {
  ALIGNS,
  applyClassChanges,
  cssColorToHex,
  describeChange,
  FONT_SIZES,
  FONT_WEIGHTS,
  hasStyleChange,
  previewStyle,
  RADII,
  SPACINGS,
  type StyleChange,
} from "@/lib/client/workspace/tailwind-edit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** What the inspector inside the preview reports about the clicked element. */
export type InspectedElement = {
  tag: string;
  id: string;
  classes: string;
  text: string;
  textOnly: boolean;
  html: string;
  path: string;
  rect: { x: number; y: number; width: number; height: number };
  styles: { color: string; backgroundColor: string; fontSize: string; fontWeight: string; textAlign: string; padding: string; borderRadius: string };
};

type EditResult = { results: { applied: boolean; path?: string; reason?: string }[]; changed: string[]; before: Record<string, string> };

const field = "h-8 w-full rounded-md border border-border bg-background px-2 text-[12.5px] outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";
const label = "text-[11.5px] font-medium text-muted-foreground";

function Select<T extends string>({ id, text, value, options, onChange, format }: { id: string; text: string; value: T | ""; options: readonly T[]; onChange: (v: T | "") => void; format?: (v: T) => string }) {
  return (
    <label htmlFor={id} className="block space-y-1">
      <span className={label}>{text}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T | "")} className={field}>
        <option value="">Unchanged</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {format ? format(o) : o}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorField({ id, text, initial, value, onChange }: { id: string; text: string; initial: string | null; value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={label}>
        {text}
      </label>
      <div className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background pl-1 pr-1.5">
        <input id={id} type="color" value={value ?? initial ?? "#000000"} onChange={(e) => onChange(e.target.value)} className="size-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted-foreground">{value ?? "Unchanged"}</span>
        {value ? (
          <button type="button" onClick={() => onChange(undefined)} aria-label={`Reset ${text.toLowerCase()}`} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
            <X className="size-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The editor for one selected element. Changes show in the preview right away (inline styles in
 * the frame); Apply writes them to the source when the element can be found exactly once
 * (text, or its Tailwind class list), and sends anything else to the AI agent with the element's
 * HTML and position as context.
 */
export function VisualEditPanel({
  projectId,
  element,
  tailwind,
  send,
  onClose,
}: {
  projectId: string;
  element: InspectedElement;
  /** The project uses Tailwind CSS, so style changes can be written as classes. */
  tailwind: boolean;
  /** Post a message to the inspector in the preview frame. */
  send: (msg: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const textEditable = element.textOnly && element.text.length > 0 && element.text.length <= 600;
  const [text, setText] = React.useState(element.text);
  const [change, setChange] = React.useState<StyleChange>({});
  const [instruction, setInstruction] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [outcome, setOutcome] = React.useState<{ saved: string[]; before: Record<string, string>; toAi: boolean } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const set = <K extends keyof StyleChange>(k: K, v: StyleChange[K] | "") => setChange((c) => ({ ...c, [k]: v || undefined }));
  const textChanged = textEditable && text.trim() !== element.text.trim() && text.trim().length > 0;
  const styled = hasStyleChange(change);
  const dirty = textChanged || styled || instruction.trim().length > 0;

  // Live preview inside the frame.
  React.useEffect(() => {
    send({ type: "preview", style: previewStyle(change), text: textChanged ? text : undefined });
  }, [change, text, textChanged, send]);

  const reset = () => {
    setText(element.text);
    setChange({});
    setInstruction("");
    send({ type: "reset" });
  };

  const apply = async () => {
    if (!dirty || busy) return;
    setBusy(true);
    setError(null);
    const edits: { kind: "text" | "class"; from: string; to: string }[] = [];
    if (textChanged) edits.push({ kind: "text", from: element.text, to: text.trim() });
    const classEdit = styled && tailwind && element.classes.trim() ? { kind: "class" as const, from: element.classes, to: applyClassChanges(element.classes, change) } : null;
    if (classEdit) edits.push(classEdit);
    try {
      let res: EditResult = { results: [], changed: [], before: {} };
      if (edits.length) res = await api<EditResult>(`/api/v1/projects/${encodeURIComponent(projectId)}/visual-edit`, { method: "POST", json: { edits } });
      const textDone = textChanged ? res.results[0]?.applied === true : true;
      const styleDone = classEdit ? res.results[edits.indexOf(classEdit)]?.applied === true : !styled;
      if (res.changed.length) {
        emit("codexa:files-changed", { paths: res.changed, source: "visual" });
        send({ type: "commit" });
      }
      // Whatever could not be written directly goes to the agent, with the element as context.
      const asks: string[] = [];
      if (!textDone) asks.push(`change its text from "${element.text}" to "${text.trim()}"`);
      if (!styleDone) asks.push(...describeChange(change));
      if (instruction.trim()) asks.push(instruction.trim());
      const toAi = asks.length > 0;
      if (toAi) {
        const prompt = [
          "Visual edit from the preview. Change only this element (and what it needs), keep everything else the same.",
          `Element: \`${element.path}\``,
          "```html",
          element.html,
          "```",
          "Changes:",
          ...asks.map((a) => `- ${a}`),
        ].join("\n");
        emit("codexa:ai-send", { text: prompt, mode: "build" });
      }
      setOutcome({ saved: res.changed, before: res.before, toAi });
      if (!toAi) send({ type: "commit" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the change.");
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!outcome) return;
    setBusy(true);
    try {
      for (const [path, content] of Object.entries(outcome.before)) await filesApi.write(projectId, path, content);
      emit("codexa:files-changed", { paths: Object.keys(outcome.before), source: "visual" });
      setOutcome(null);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not undo.");
    } finally {
      setBusy(false);
    }
  };

  const tagLabel = `<${element.tag}${element.id ? `#${element.id}` : ""}>`;

  return (
    <div role="dialog" aria-label="Edit element" className="ws-drop glass absolute inset-x-3 bottom-3 z-[6] mx-auto max-w-[560px] rounded-2xl border border-border-strong bg-card/95 p-3.5 shadow-xl backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11.5px] font-medium">{tagLabel}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground" title={element.path}>
          {element.path}
        </span>
        <button type="button" onClick={onClose} aria-label="Close the element editor" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {outcome ? (
        <div className="mt-3 space-y-2 text-[13px]" role="status">
          {outcome.saved.length ? (
            <p className="flex items-center gap-2">
              <Check className="size-4 text-success" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                Saved to <span className="font-mono text-[12px]">{outcome.saved.join(", ")}</span>
              </span>
              <Button size="sm" variant="outline" appearance="app" onClick={() => void undo()} loading={busy}>
                <Undo2 className="size-3.5" aria-hidden="true" /> Undo
              </Button>
            </p>
          ) : null}
          {outcome.toAi ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="size-4 text-signal" aria-hidden="true" />
              {outcome.saved.length ? "The rest was sent to the AI agent, which is applying it now." : "Sent to the AI agent, which is applying it now."}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button size="sm" appearance="app" variant="outline" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void apply();
          }}
        >
          {textEditable ? (
            <label htmlFor="ve-text" className="block space-y-1">
              <span className={label}>Text</span>
              <textarea id="ve-text" value={text} onChange={(e) => setText(e.target.value)} rows={text.length > 80 ? 3 : 1} className={cn(field, "h-auto resize-none py-1.5 leading-snug")} />
            </label>
          ) : null}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <ColorField id="ve-color" text="Text colour" initial={cssColorToHex(element.styles.color)} value={change.color} onChange={(v) => set("color", v)} />
            <ColorField id="ve-bg" text="Background" initial={cssColorToHex(element.styles.backgroundColor) ?? "#ffffff"} value={change.background} onChange={(v) => set("background", v)} />
            <Select id="ve-size" text={`Size (now ${element.styles.fontSize})`} value={change.fontSize ?? ""} options={FONT_SIZES} onChange={(v) => set("fontSize", v)} />
            <Select id="ve-weight" text="Weight" value={change.fontWeight ?? ""} options={FONT_WEIGHTS} onChange={(v) => set("fontWeight", v)} />
            <Select id="ve-align" text="Align" value={change.align ?? ""} options={ALIGNS} onChange={(v) => set("align", v)} />
            <Select id="ve-pad" text="Padding" value={change.padding ?? ""} options={SPACINGS} onChange={(v) => set("padding", v)} format={(v) => `${Number(v) * 4}px`} />
            <Select id="ve-radius" text="Corners" value={change.radius ?? ""} options={RADII} onChange={(v) => set("radius", v)} />
          </div>
          <label htmlFor="ve-ask" className="block space-y-1">
            <span className={label}>Or describe a change for the AI</span>
            <input id="ve-ask" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="e.g. make this a two-column layout with an image on the right" className={field} />
          </label>
          {error ? (
            <p role="alert" className="text-[12.5px] text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-[11.5px] leading-snug text-muted-foreground">
              {tailwind ? "Text and style changes save straight to your code when Codexa can find them; anything else goes to the AI." : "Text saves straight to your code; style changes go to the AI (this project does not use Tailwind)."}
            </p>
            <Button type="button" size="sm" variant="ghost" appearance="app" onClick={reset} disabled={!dirty || busy}>
              <RotateCcw className="size-3.5" aria-hidden="true" /> Reset
            </Button>
            <Button type="submit" size="sm" appearance="app" disabled={!dirty} loading={busy}>
              <Check className="size-3.5" aria-hidden="true" /> Apply
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Shown on the preview while edit mode is on and nothing is selected yet. */
export function VisualEditHint({ onExit }: { onExit: () => void }) {
  return (
    <div className="ws-drop glass absolute left-1/2 top-3 z-[5] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-strong py-1 pl-3 pr-1 text-[12px] font-medium shadow-lg" role="status">
      <MousePointerClick className="size-3.5 text-signal" aria-hidden="true" />
      Click any element to edit it
      <button type="button" onClick={onExit} className="rounded-full px-2 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
        Done
      </button>
    </div>
  );
}
