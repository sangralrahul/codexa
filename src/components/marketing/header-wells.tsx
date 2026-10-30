import * as React from "react";
import { ArrowRight, Check, FileCode2, Globe, Search, ShieldAlert } from "lucide-react";
import { NAV, type NavItem } from "@/config/routes";
import { BrandMark } from "@/components/brand";
import { CodeLines } from "@/components/vignettes/code-lines";
import { LogoMark } from "@/components/logo";
import { ModKey } from "@/components/ui/kbd";
import { templateShotFor } from "@/components/templates/shots";
import type { ChromeData } from "./chrome-data";

/**
 * Featured wells for the header mega menus (PLAN §5.1): 260×180 CSS-only mini vignettes,
 * rendered on the server and handed to the client header as props, so they cost no client JS.
 * Each well replays its entrance (`.mk-in`, staggered by --d) when its item is hovered or focused.
 * Decorative: the header marks the well container aria-hidden; the link text carries the meaning.
 * Screenshots use the 720w captures and are not fetched until the visitor first reaches for a menu
 * (the header sets data-armed; until then marketing.css keeps the well images display:none).
 */
const d = (n: number) => ({ "--d": n }) as React.CSSProperties;

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mk-in mt-auto truncate pt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground" style={d(5)}>{children}</p>;
}

function Tick({ label, detail, i }: { label: React.ReactNode; detail?: string; i: number }) {
  return (
    <li className="mk-in flex items-center gap-2 rounded-md bg-background/70 px-2 py-1.5 shadow-[inset_0_0_0_1px_var(--border)]" style={d(i)}>
      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
        <Check className="size-2.5" strokeWidth={3} />
      </span>
      <span className="min-w-0 truncate font-mono text-[10.5px] text-foreground">{label}</span>
      {detail ? <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{detail}</span> : null}
    </li>
  );
}

function BuilderWell() {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="mk-in rounded-lg bg-background/80 px-2.5 py-2 text-[11.5px] leading-snug shadow-[inset_0_0_0_1px_var(--border)]" style={d(0)}>
        <span className="text-primary">›</span> A booking app for a yoga studio<span className="caret" />
      </div>
      <ul className="mt-2 space-y-1">
        {["src/App.tsx", "src/pages/Schedule.tsx", "src/lib/slots.ts"].map((p, i) => (
          <li key={p} className="mk-in flex items-center gap-2 font-mono text-[10.5px]" style={d(i + 1)}>
            <FileCode2 className="size-3 text-muted-foreground" />
            <span className="truncate text-foreground/85">{p}</span>
            <span className="ml-auto text-success">A</span>
          </li>
        ))}
      </ul>
      <Caption>Illustration · sample prompt</Caption>
    </div>
  );
}

function AgentWell() {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="mk-in mb-2 flex items-center gap-1.5 text-[11px]" style={d(0)}>
        <LogoMark size={14} />
        <span className="font-medium">Agent</span>
        <span className="text-muted-foreground">· Build</span>
      </div>
      <ul className="space-y-1">
        <Tick i={1} label="read_file src/App.tsx" />
        <Tick i={2} label="write_file src/Invoices.tsx" detail="+48" />
        <Tick i={3} label="run_command typecheck" detail="0 errors" />
      </ul>
      <Caption>Real tool names · scripted</Caption>
    </div>
  );
}

const EDITOR_CODE = `export function Total({ items }) {
  const sum = items.reduce(add, 0);
  return <Price value={sum} />;
}`;

function EditorWell() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-7 items-center gap-2 border-b border-border bg-background/60 px-3 font-mono text-[10px] text-muted-foreground">
        <span className="text-foreground">Total.tsx</span>
        <span>styles.css</span>
        <span className="ml-auto">Saved</span>
      </div>
      <div className="mk-in flex-1 bg-code-bg py-2 pr-2" style={d(1)}>
        <CodeLines code={EDITOR_CODE} lang="tsx" highlight={[3]} className="text-[10.5px] leading-[1.75]" />
      </div>
    </div>
  );
}

function DeployWell() {
  const rows = [
    { v: "v3", note: "Pricing page", live: true },
    { v: "v2", note: "Invoice table", live: false },
    { v: "v1", note: "First deploy", live: false },
  ];
  return (
    <div className="flex h-full flex-col p-3">
      <div className="mk-in mb-2 flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 font-mono text-[10px] shadow-[inset_0_0_0_1px_var(--border)]" style={d(0)}>
        <Globe className="size-3 text-muted-foreground" />
        <span className="truncate">your-app.example.com</span>
        <span className="live-dot ml-auto" />
      </div>
      <ul className="space-y-1">
        {rows.map((r, i) => (
          <li key={r.v} className="mk-in flex items-center gap-2 rounded-md bg-background/70 px-2 py-1.5 text-[10.5px] shadow-[inset_0_0_0_1px_var(--border)]" style={d(i + 1)}>
            <span className="font-mono font-medium">{r.v}</span>
            <span className="truncate text-muted-foreground">{r.note}</span>
            {r.live ? (
              <span className="ml-auto rounded-full bg-success/15 px-1.5 py-px text-[9.5px] font-medium text-success">Live</span>
            ) : (
              <span className="ml-auto rounded-full px-1.5 py-px text-[9.5px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">Roll back</span>
            )}
          </li>
        ))}
      </ul>
      <Caption>Sample data · sample domain</Caption>
    </div>
  );
}

const MARKS = ["stripe", "razorpay", "supabase", "postgres", "resend", "github"] as const;

function IntegrationsWell() {
  return (
    <div className="flex h-full flex-col p-3">
      <ul className="grid grid-cols-3 gap-1.5">
        {MARKS.map((id, i) => (
          <li key={id} className="mk-in flex h-11 items-center justify-center rounded-md bg-background/70 text-foreground/80 shadow-[inset_0_0_0_1px_var(--border)]" style={d(i)}>
            <BrandMark id={id} className="size-[18px]" />
          </li>
        ))}
      </ul>
      <Caption>Your keys · no partnership implied</Caption>
    </div>
  );
}

function TemplatesWell({ templates }: { templates: ChromeData["templates"] }) {
  if (!templates.length) return <DocsWell />;
  return (
    <div className="flex h-full flex-col p-2">
      <ul className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1.5">
        {templates.slice(0, 4).map((t, i) => (
          <li key={t.id} className="mk-in min-h-0 overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]" style={d(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={templateShotFor(t.id, 240)} alt="" width={120} height={75} loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
          </li>
        ))}
      </ul>
      <p className="mk-in truncate px-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground" style={d(5)}>
        Real starters · their own builds
      </p>
    </div>
  );
}

function ChangelogWell({ entry }: { entry: ChromeData["changelog"] }) {
  if (!entry) return <DocsWell />;
  return (
    <div className="flex h-full flex-col p-3.5">
      <div className="mk-in flex items-center gap-2 text-[10.5px]" style={d(0)}>
        <span className="rounded-full bg-primary/12 px-2 py-0.5 font-mono font-medium text-primary">{entry.version ? `v${entry.version}` : "Latest"}</span>
        <time dateTime={entry.date} className="text-muted-foreground">
          {entry.dateLabel}
        </time>
      </div>
      <p className="mk-in mt-2.5 text-[14px] font-semibold leading-snug tracking-tight" style={d(1)}>
        {entry.title}
      </p>
      <p className="mk-in mt-1 line-clamp-3 text-[11.5px] leading-snug text-muted-foreground" style={d(2)}>
        {entry.description}
      </p>
      <p className="mk-in mt-auto flex items-center gap-1 text-[11px] font-medium text-foreground/80" style={d(3)}>
        Latest of {entry.count} changelog entries <ArrowRight className="size-3" />
      </p>
    </div>
  );
}

function DocsWell() {
  const docs = ["Quickstart", "AI agent", "Deployment", "Environment variables"];
  return (
    <div className="flex h-full flex-col p-3">
      <div className="mk-in flex items-center gap-2 rounded-lg bg-background/80 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]" style={d(0)}>
        <Search className="size-3" />
        Search docs
        <span className="ml-auto rounded bg-muted px-1 font-mono text-[9.5px]">
          <ModKey /> K
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {docs.map((t, i) => (
          <li key={t} className="mk-in flex items-center gap-2 text-[11px]" style={d(i + 1)}>
            <span className="h-px w-3 bg-border-strong" />
            <span className="text-foreground/85">{t}</span>
          </li>
        ))}
      </ul>
      <Caption>Guides and reference</Caption>
    </div>
  );
}

function SolutionWell({ item, name }: { item: NavItem; name?: string }) {
  if (!item.template || !name) return <DocsWell />;
  return (
    <div className="flex h-full flex-col p-2">
      <div className="mk-in relative flex-1 overflow-hidden rounded-md bg-white shadow-[inset_0_0_0_1px_var(--border)]" style={d(0)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={templateShotFor(item.template, 244)} alt="" width={244} height={150} loading="lazy" decoding="async" className="mk-pan absolute inset-0 h-full w-full object-cover object-top" />
      </div>
      <p className="mk-in truncate px-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground" style={d(2)}>
        Starter · {name}
      </p>
    </div>
  );
}

function CompanyWell() {
  return (
    <div className="flex h-full flex-col justify-between p-3.5">
      <p className="mk-in font-display text-[19px] font-semibold leading-[1.15] tracking-[-0.02em] [font-stretch:104%]" style={d(0)}>
        Software you can <span className="text-dim">read, run and keep.</span>
      </p>
      <p className="mk-in text-[11px] leading-snug text-muted-foreground" style={d(2)}>
        A small team building in India, for builders everywhere. No invented logos or numbers on this site.
      </p>
    </div>
  );
}

function SecurityWell() {
  return (
    <div className="flex h-full flex-col p-3">
      <p className="mk-in flex items-center gap-1.5 rounded-md bg-warning/10 px-2 py-1.5 text-[10.5px] font-medium text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--warning)_35%,transparent)]" style={d(0)}>
        <ShieldAlert className="size-3.5 text-warning" />
        No third-party certifications yet
      </p>
      <ul className="mt-2 space-y-1">
        {["Code never runs in the web app", "Secrets encrypted at rest", "Hashed session tokens"].map((t, i) => (
          <Tick key={t} i={i + 1} label={<span className="font-sans">{t}</span>} />
        ))}
      </ul>
    </div>
  );
}

function StatusWell() {
  const parts = ["Web application", "Database", "Runner", "AI generation", "Email"];
  return (
    <div className="flex h-full flex-col p-3">
      <ul className="space-y-1">
        {parts.map((p, i) => (
          <li key={p} className="mk-in flex items-center gap-2 text-[11px]" style={d(i)}>
            <span className="size-1.5 rounded-full bg-muted-foreground/50" />
            <span className="text-foreground/85">{p}</span>
            <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">checked live</span>
          </li>
        ))}
      </ul>
      <Caption>Probed when you open the page</Caption>
    </div>
  );
}

/** Wells keyed by nav item href. */
export function buildHeaderWells(data: ChromeData): Record<string, React.ReactNode> {
  const all: NavItem[] = [...NAV.product, ...NAV.solutions, ...NAV.resources, ...NAV.company];
  const out: Record<string, React.ReactNode> = {};
  for (const item of all) {
    out[item.href] = (() => {
      switch (item.well) {
        case "builder":
          return <BuilderWell />;
        case "agent":
          return <AgentWell />;
        case "editor":
          return <EditorWell />;
        case "deploy":
          return <DeployWell />;
        case "integrations":
          return <IntegrationsWell />;
        case "templates":
          return <TemplatesWell templates={data.templates} />;
        case "changelog":
          return <ChangelogWell entry={data.changelog} />;
        case "docs":
          return <DocsWell />;
        case "solution":
          return <SolutionWell item={item} name={item.template ? data.shots[item.template] : undefined} />;
        case "company":
          return <CompanyWell />;
        case "security":
          return <SecurityWell />;
        case "status":
          return <StatusWell />;
      }
    })();
  }
  return out;
}
