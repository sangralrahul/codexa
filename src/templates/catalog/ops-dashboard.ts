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
  return (
    <svg viewBox={"0 0 " + w + " " + h} width={w} height={h} role="img" aria-label={label} className={className}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
`,
  "src/App.tsx": `import { useEffect, useState } from "react";
import { incidents as seedIncidents, services as seedServices, tick, type Incident, type Service } from "./data";
import { Sparkline } from "./Sparkline";

const statusColor: Record<Service["status"], string> = { operational: "bg-green-500", degraded: "bg-amber-500", down: "bg-red-500" };
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <h1 className="font-semibold tracking-tight">Operations</h1>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
            Simulate live updates
          </label>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <p className="text-sm text-zinc-400" role="status">
          {degraded === 0 ? "All systems operational." : degraded + " service" + (degraded === 1 ? "" : "s") + " degraded."}
        </p>
        <section aria-labelledby="services-title" className="mt-4">
          <h2 id="services-title" className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Services
          </h2>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => {
              const last = s.latencyMs[s.latencyMs.length - 1] ?? 0;
              return (
                <li key={s.name} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{s.name}</h3>
                    <span className="flex items-center gap-1.5 text-xs capitalize text-zinc-400">
                      <span aria-hidden="true" className={"size-2 rounded-full " + statusColor[s.status]} />
                      {s.status}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums">
                    {last}
                    <span className="text-sm font-normal text-zinc-500"> ms</span>
                  </p>
                  <Sparkline values={s.latencyMs} label={s.name + " latency over the last 24 samples"} className="mt-2 text-sky-400" />
                  <p className="mt-2 text-xs text-zinc-500">Error rate {s.errorRate.toFixed(1)}%</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="incidents-title" className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="incidents-title" className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Incidents
            </h2>
            <div className="flex gap-1 rounded-md border border-zinc-800 p-0.5" role="group" aria-label="Filter incidents">
              {incidentFilters.map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={"rounded px-2.5 py-1 text-xs capitalize " + (filter === f ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-100")}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-zinc-900 text-left text-zinc-400">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Opened</th>
                </tr>
              </thead>
              <tbody>
                {visibleIncidents.map((i) => (
                  <tr key={i.id} className="border-t border-zinc-800">
                    <td className="p-3 font-mono text-xs text-zinc-400">{i.id}</td>
                    <td className="p-3">{i.title}</td>
                    <td className="p-3 text-zinc-400">{i.service}</td>
                    <td className="p-3 capitalize">{i.status}</td>
                    <td className="p-3 text-zinc-400">{new Date(i.openedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {visibleIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-zinc-500">
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
