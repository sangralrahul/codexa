import type { Template } from "../types";
import { VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-ops-dashboard",
    title: "Operations dashboard",
    readme: `# Operations dashboard

Service health overview with inline SVG sparklines (no chart library), an incident list with status filters,
and an auto-refresh toggle that re-samples the local data. Replace \`src/data.ts\` with your metrics API.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  }),
  "src/data.ts": `export type Service = { name: string; status: "operational" | "degraded" | "down"; latencyMs: number[]; errorRate: number };
export type Incident = { id: string; title: string; service: string; status: "open" | "monitoring" | "resolved"; openedAt: string };

/** Deterministic pseudo-random series so the demo is stable between reloads. */
function series(seed: number, base: number, spread: number, n = 24) {
  const out: number[] = [];
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    out.push(Math.round(base + (x / 233280 - 0.5) * spread));
  }
  return out;
}

export const services: Service[] = [
  { name: "API", status: "operational", latencyMs: series(7, 120, 40), errorRate: 0.2 },
  { name: "Web", status: "operational", latencyMs: series(13, 80, 30), errorRate: 0.1 },
  { name: "Worker", status: "degraded", latencyMs: series(21, 400, 250), errorRate: 2.4 },
  { name: "Database", status: "operational", latencyMs: series(5, 12, 6), errorRate: 0 },
];

export const incidents: Incident[] = [
  { id: "INC-104", title: "Worker queue backlog above 5k jobs", service: "Worker", status: "monitoring", openedAt: "2026-05-02T08:14:00Z" },
  { id: "INC-103", title: "Elevated 5xx on /api/export", service: "API", status: "resolved", openedAt: "2026-04-29T16:40:00Z" },
  { id: "INC-102", title: "Slow dashboard loads for EU users", service: "Web", status: "resolved", openedAt: "2026-04-25T09:02:00Z" },
  { id: "INC-101", title: "Scheduled database maintenance", service: "Database", status: "resolved", openedAt: "2026-04-20T22:00:00Z" },
];

/** Simulate a new sample arriving. In a real app, fetch from your metrics endpoint instead. */
export function tick(list: Service[]): Service[] {
  return list.map((s) => {
    const last = s.latencyMs[s.latencyMs.length - 1] ?? 100;
    const next = Math.max(1, Math.round(last + (Math.random() - 0.5) * last * 0.2));
    return { ...s, latencyMs: [...s.latencyMs.slice(1), next] };
  });
}
`,
  "src/Sparkline.tsx": `export function Sparkline({ values, label, className }: { values: number[]; label: string; className?: string }) {
  const w = 120;
  const h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / range) * (h - 4) - 2] as const);
  const d = points.map(([x, y], i) => (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1)).join(" ");
  const area = d + " L" + w + " " + h + " L0 " + h + " Z";
  const id = "spark-" + label.replace(/[^a-z0-9]/gi, "");
  return (
    <svg viewBox={"0 0 " + w + " " + h} preserveAspectRatio="none" role="img" aria-label={label} className={className}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={"url(#" + id + ")"} />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
`,
  "src/App.tsx": `import { useEffect, useState } from "react";
import { incidents as seedIncidents, services as seedServices, tick, type Incident, type Service } from "./data";
import { Sparkline } from "./Sparkline";

const statusColor: Record<Service["status"], string> = { operational: "bg-emerald-400", degraded: "bg-amber-400", down: "bg-rose-500" };
const lineColor: Record<Service["status"], string> = { operational: "text-sky-400", degraded: "text-amber-400", down: "text-rose-400" };
const incidentTone: Record<Incident["status"], string> = { open: "bg-rose-500/15 text-rose-300", monitoring: "bg-amber-400/15 text-amber-300", resolved: "bg-emerald-400/10 text-emerald-300" };
const incidentFilters: ("all" | Incident["status"])[] = ["all", "open", "monitoring", "resolved"];

export default function App() {
  const [services, setServices] = useState<Service[]>(seedServices);
  const [live, setLive] = useState(false);
  const [filter, setFilter] = useState<(typeof incidentFilters)[number]>("all");

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setServices((s) => tick(s)), 2000);
    return () => window.clearInterval(id);
  }, [live]);

  const visibleIncidents = seedIncidents.filter((i) => filter === "all" || i.status === filter);
  const degraded = services.filter((s) => s.status !== "operational").length;
  const avgLatency = Math.round(services.reduce((sum, s) => sum + (s.latencyMs[s.latencyMs.length - 1] ?? 0), 0) / services.length);
  const avgErrors = services.reduce((sum, s) => sum + s.errorRate, 0) / services.length;
  const active = seedIncidents.filter((i) => i.status !== "resolved").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-zinc-950">O</span>
            <h1 className="font-semibold tracking-tight">Operations</h1>
            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-400">production</span>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-400">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="peer sr-only" />
            <span className="relative h-5 w-9 rounded-full bg-zinc-800 transition peer-checked:bg-sky-500 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
            Simulate live updates
          </label>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className={"flex items-center gap-3 rounded-2xl border px-5 py-4 " + (degraded === 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-400/20 bg-amber-400/5")}>
          <span className={"h-2.5 w-2.5 rounded-full " + (degraded === 0 ? "bg-emerald-400" : "bg-amber-400")} />
          <p className="text-sm" role="status">
            <span className="font-medium">{degraded === 0 ? "All systems operational." : degraded + " service" + (degraded === 1 ? "" : "s") + " degraded."}</span>
            <span className="text-zinc-400"> Sample data · replace src/data.ts with your metrics API.</span>
          </p>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["Average latency", avgLatency + " ms"],
            ["Average error rate", avgErrors.toFixed(2) + "%"],
            ["Active incidents", String(active)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <dt className="text-xs text-zinc-500">{label}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="services-title" className="mt-8">
          <h2 id="services-title" className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
            Services
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => {
              const last = s.latencyMs[s.latencyMs.length - 1] ?? 0;
              return (
                <li key={s.name} className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{s.name}</h3>
                    <span className="flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-2 py-0.5 text-xs capitalize text-zinc-300">
                      <span aria-hidden="true" className={"size-1.5 rounded-full " + statusColor[s.status]} />
                      {s.status}
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
                    {last}
                    <span className="text-sm font-normal text-zinc-500"> ms</span>
                  </p>
                  <Sparkline values={s.latencyMs} label={s.name + " latency over the last 24 samples"} className={"mt-2 h-12 w-full " + lineColor[s.status]} />
                  <p className="mt-2 flex justify-between text-xs text-zinc-500">
                    <span>Error rate</span>
                    <span className="tabular-nums text-zinc-300">{s.errorRate.toFixed(1)}%</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="incidents-title" className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="incidents-title" className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
              Incidents
            </h2>
            <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-0.5" role="group" aria-label="Filter incidents">
              {incidentFilters.map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={"rounded-md px-2.5 py-1 text-xs capitalize " + (filter === f ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-100")}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-zinc-900 text-left text-xs text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Opened</th>
                </tr>
              </thead>
              <tbody>
                {visibleIncidents.map((i) => (
                  <tr key={i.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{i.id}</td>
                    <td className="px-4 py-3">{i.title}</td>
                    <td className="px-4 py-3 text-zinc-400">{i.service}</td>
                    <td className="px-4 py-3">
                      <span className={"rounded-full px-2 py-0.5 text-xs capitalize " + incidentTone[i.status]}>{i.status}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-400">{new Date(i.openedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {visibleIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      No incidents with this status.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
`,
};

export const opsDashboardTemplate: Template = {
  id: "vite-react-ops-dashboard",
  name: "Operations dashboard",
  description: "A dark service-health dashboard with SVG sparklines, status indicators, and a filterable incident table.",
  longDescription:
    "A second dashboard variant focused on monitoring rather than business metrics. Each service card shows current latency, a dependency-free SVG sparkline of the last 24 samples and an error rate; the incident table filters by status. A 'simulate live updates' toggle re-samples the local data every two seconds so you can see how the UI behaves with changing values before connecting a real metrics endpoint.",
  category: "dashboards",
  tags: ["react", "dashboard", "monitoring", "charts", "dark-mode", "tailwind"],
  framework: "vite-react",
  dependencies: VITE_DEPS,
  settings: VITE_SETTINGS,
  prebuilt: true,
  difficulty: "intermediate",
  previewPath: "/",
  files,
};
