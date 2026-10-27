"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, FileCode2, Files, History, MessageSquare, Play, Rocket, Search, Sparkles } from "lucide-react";
import { filesApi } from "@/lib/client/workspace/api";
import { useAgent } from "@/lib/client/workspace/agent";
import type { FileEntry } from "@/lib/client/workspace/types";
import { TemplatePreview } from "@/components/templates/template-preview";
import { Kbd } from "@/components/ui/misc";
import { relativeTime } from "@/components/projects/format";
import { cn } from "@/lib/utils";
import { FileIcon } from "./file-icon";

/** Display names for dependencies worth naming; everything else is counted, not invented. */
const STACK_NAMES: Record<string, string> = {
  react: "React",
  vite: "Vite",
  typescript: "TypeScript",
  tailwindcss: "Tailwind CSS",
  "@tailwindcss/vite": "Tailwind CSS",
  express: "Express",
  "react-router-dom": "React Router",
  "react-router": "React Router",
  zustand: "Zustand",
  "@tanstack/react-query": "TanStack Query",
  "framer-motion": "Framer Motion",
  motion: "Motion",
  recharts: "Recharts",
  "chart.js": "Chart.js",
  zod: "Zod",
  "lucide-react": "Lucide",
  next: "Next.js",
  vue: "Vue",
  svelte: "Svelte",
};

type Pkg = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

export type OverviewAction = "run" | "agent" | "quick-open" | "search" | "history" | "publish";

/**
 * The "Project overview" start tab: the template picture (labelled as the starting point),
 * the stack read from the project's own package.json, the file count, what the AI changed
 * in this session, and quick actions. Every fact comes from the project's files or real state.
 */
export function ProjectOverview({
  projectId,
  name,
  description,
  template,
  files,
  onOpen,
  onAction,
  canEdit,
}: {
  projectId: string;
  name: string;
  description?: string;
  template?: { id: string; name: string; category: string } | null;
  files: FileEntry[];
  onOpen: (path: string) => void;
  onAction: (a: OverviewAction) => void;
  canEdit: boolean;
}) {
  const agent = useAgent();
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const hasPkg = files.some((f) => f.path === "package.json");

  useEffect(() => {
    if (!hasPkg) return;
    let cancelled = false;
    filesApi
      .read(projectId, "package.json")
      .then((r) => {
        if (cancelled) return;
        try {
          setPkg(JSON.parse(r.content) as Pkg);
        } catch {
          setPkg({});
        }
      })
      .catch(() => !cancelled && setPkg({}));
    return () => {
      cancelled = true;
    };
  }, [projectId, hasPkg]);

  const stack = useMemo(() => {
    if (!pkg) return [];
    const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    const seen = new Set<string>();
    const out: { name: string; version: string }[] = [];
    for (const [dep, version] of Object.entries(all)) {
      const label = STACK_NAMES[dep];
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push({ name: label, version: version.replace(/^[\^~]/, "") });
    }
    return out;
  }, [pkg]);
  const depCount = pkg ? Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length : null;

  const recentAi = useMemo(
    () =>
      Object.values(agent.touched)
        .sort((a, b) => b.at - a.at)
        .slice(0, 5),
    [agent.touched],
  );
  const bytes = files.reduce((n, f) => n + f.size, 0);

  const actions: { id: OverviewAction; label: string; Icon: typeof Play; kbd?: React.ReactNode; disabled?: boolean }[] = [
    { id: "agent", label: "Ask the agent", Icon: MessageSquare },
    { id: "run", label: "Run preview", Icon: Play, disabled: !canEdit },
    { id: "quick-open", label: "Open a file", Icon: Files, kbd: <Kbd mod>P</Kbd> },
    { id: "search", label: "Search in files", Icon: Search, kbd: <Kbd mod>⇧F</Kbd> },
    { id: "history", label: "Version history", Icon: History },
    { id: "publish", label: "Publish", Icon: Rocket, disabled: !canEdit },
  ];

  return (
    <div className="scrollbar-thin @container h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-5 py-7 @[560px]:px-7">
        <div className="flex flex-col gap-5 @[620px]:flex-row @[620px]:items-start @[620px]:gap-6">
          {template ? (
            <figure className="w-full max-w-[360px] shrink-0 @[620px]:w-[240px]">
              <TemplatePreview id={template.id} category={template.category} sizes="240px" className="rounded-xl" />
              <figcaption className="mt-1.5 text-[11.5px] text-muted-foreground">Started from the {template.name} template</figcaption>
            </figure>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11.5px] text-muted-foreground">Project overview</p>
            <h2 className="mt-1 font-display text-[26px] font-[680] leading-tight tracking-[-0.025em]">{name}</h2>
            {description ? <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{description}</p> : null}
            <dl className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Files" value={files.length.toLocaleString("en-US")} />
              <Stat label="Size" value={bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`} />
              <Stat label="Packages" value={depCount === null ? (hasPkg ? "…" : "None") : String(depCount)} />
            </dl>
            {stack.length ? (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Stack, from package.json">
                {stack.map((s) => (
                  <li key={s.name} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[12px] font-medium">
                    {s.name}
                    <span className="font-mono text-[10.5px] text-muted-foreground">{s.version}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="mt-8 grid gap-6 @[620px]:grid-cols-2">
          <section aria-labelledby="ov-actions">
            <h3 id="ov-actions" className="text-[13px] font-semibold">
              Quick actions
            </h3>
            <ul className="mt-2 overflow-hidden rounded-xl border border-border">
              {actions.map(({ id, label, Icon, kbd, disabled }) => (
                <li key={id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onAction(id)}
                    className="flex h-10 w-full items-center gap-2.5 px-3 text-left text-[13px] transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                  >
                    <Icon className={cn("size-4 text-muted-foreground", id === "publish" && "text-signal")} aria-hidden="true" />
                    {label}
                    {kbd ? <span className="ml-auto">{kbd}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="ov-ai">
            <h3 id="ov-ai" className="flex items-center gap-1.5 text-[13px] font-semibold">
              <Sparkles className="size-3.5 text-signal" aria-hidden="true" /> Changed by the AI
            </h3>
            {recentAi.length ? (
              <ul className="mt-2 overflow-hidden rounded-xl border border-border">
                {recentAi.map((f) => (
                  <li key={f.path} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      disabled={f.action === "delete"}
                      onClick={() => onOpen(f.path)}
                      className="flex h-10 w-full items-center gap-2.5 px-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
                    >
                      <FileIcon name={f.path.split("/").pop() ?? f.path} />
                      <span className={cn("min-w-0 flex-1 truncate font-mono text-[12px]", f.action === "delete" && "line-through")}>{f.path}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(new Date(f.at).toISOString())}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-dashed border-border-strong p-3 text-[12.5px] text-muted-foreground">
                <Bot className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>Files the agent writes in this session are listed here, newest first.</p>
              </div>
            )}
            <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <FileCode2 className="size-3.5" aria-hidden="true" /> Open any file from the explorer, or press <Kbd mod>P</Kbd>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card px-3 py-2 shadow-[inset_0_1px_0_var(--hairline)]">
      <dt className="truncate text-[11.5px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-[15px] font-medium tabular-nums">{value}</dd>
    </div>
  );
}
