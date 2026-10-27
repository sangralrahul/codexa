import type { Template } from "./types";
import { VITE_DEPS, VITE_SETTINGS, viteBase } from "./shared";

const readme = (title: string, body: string) => `# ${title}

${body}

\`\`\`bash
npm install
npm run dev
\`\`\`
`;

const settings = VITE_SETTINGS;
const deps = VITE_DEPS;

/**
 * The first template here defines the prebuilt dependency set the runner
 * installs for every vite-react project (services/runner/prepare.ts).
 */
export const viteReactTemplates: Template[] = [
  {
    id: "vite-react-starter",
    name: "React starter",
    description: "A clean React + TypeScript + Tailwind single-page app. The default target for AI generation.",
    longDescription:
      "The smallest useful starting point: one App component, Tailwind CSS v4 wired through the Vite plugin, strict TypeScript, and nothing else to delete. Most AI generation runs start here because the agent can add pages, state and components without fighting an opinionated structure.",
    category: "web-apps",
    tags: ["react", "typescript", "tailwind", "vite", "spa"],
    framework: "vite-react",
    dependencies: deps,
    settings,
    prebuilt: true,
    featured: true,
    difficulty: "beginner",
    previewPath: "/",
    files: {
      ...viteBase({
        name: "codexa-app",
        title: "Codexa App",
        readme: readme(
          "React starter",
          "A clean React 19 + TypeScript + Tailwind CSS v4 single-page app. Everything lives in `src/App.tsx`; describe what you want in the Codexa chat and the agent adds pages, state and components from here.",
        ),
      }),
      "src/App.tsx": `import { useState } from "react";

const ideas = [
  "Add a pricing page with three plans",
  "Turn this into a habit tracker with weekly streaks",
  "Show a dashboard of signups from a CSV I paste in",
];

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Decorative background: a faint grid and one soft colour field. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgb(15_23_42/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(15_23_42/0.05)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_50%_35%,black_25%,transparent_70%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-20rem] h-[38rem] w-[64rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-200 via-sky-100 to-rose-200 opacity-70 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          React 19 · TypeScript · Tailwind CSS v4
        </span>
        <h1 className="mt-8 text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">Your app starts here.</h1>
        <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-slate-600">
          A clean starting point with nothing to delete. Describe what you want to build in the Codexa chat and the agent edits these files for you.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setCount((c) => c + 1)}
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 active:scale-[0.98]"
          >
            Clicked {count} {count === 1 ? "time" : "times"}
          </button>
          <a href="https://react.dev/learn" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
            Learn React
          </a>
        </div>

        <div className="mt-14 w-full max-w-xl rounded-2xl border border-slate-200 bg-white/80 p-2 text-left shadow-xl shadow-slate-900/5 backdrop-blur">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Try asking for</p>
          <ul>
            {ideas.map((idea) => (
              <li key={idea} className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
                <span>“{idea}”</span>
                <span aria-hidden="true" className="text-slate-300">↵</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-xs text-slate-400">
          Edit <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">src/App.tsx</code> and save to see your changes.
        </p>
      </div>
    </main>
  );
}
`,
    },
  },
  {
    id: "vite-react-dashboard",
    name: "Analytics dashboard",
    description: "A responsive dashboard layout with sidebar navigation, stat cards, and a data table.",
    longDescription:
      "A sidebar + content dashboard shell with stat cards, a dependency-free SVG revenue chart, a plan-mix breakdown and a searchable customer table backed by an in-memory array. Swap the array for a fetch call to your API and the table keeps working. Uses CSS grid for the responsive layout, so it collapses to a single column on phones.",
    category: "dashboards",
    tags: ["react", "dashboard", "tailwind", "table"],
    framework: "vite-react",
    dependencies: deps,
    settings,
    prebuilt: true,
    featured: true,
    difficulty: "intermediate",
    previewPath: "/",
    files: {
      ...viteBase({
        name: "codexa-dashboard",
        title: "Acme Analytics",
        readme: readme(
          "Analytics dashboard",
          "A sidebar + content dashboard: KPI cards, an SVG revenue chart (no chart library), a plan-mix breakdown and a searchable customers table. All numbers are sample data in `src/data.ts`; replace it with calls to your API.",
        ),
      }),
      "src/data.ts": `export type Plan = "Free" | "Pro" | "Team";
export type Status = "active" | "trialing" | "churned";
export type Row = { id: number; customer: string; email: string; plan: Plan; mrr: number; status: Status; joined: string };

/** Sample data. Replace with a fetch to your API. */
export const rows: Row[] = [
  { id: 1, customer: "Aarav Studio", email: "billing@aarav.studio", plan: "Pro", mrr: 1499, status: "active", joined: "2026-01-14" },
  { id: 2, customer: "Nimbus Labs", email: "ops@nimbuslabs.io", plan: "Team", mrr: 3999, status: "active", joined: "2025-11-02" },
  { id: 3, customer: "Priya Designs", email: "hello@priya.design", plan: "Free", mrr: 0, status: "trialing", joined: "2026-04-21" },
  { id: 4, customer: "Orbit Retail", email: "finance@orbitretail.com", plan: "Pro", mrr: 1499, status: "churned", joined: "2025-08-30" },
  { id: 5, customer: "Kavya Tech", email: "admin@kavya.tech", plan: "Team", mrr: 3999, status: "active", joined: "2025-12-09" },
  { id: 6, customer: "Lumen Health", email: "it@lumenhealth.co", plan: "Team", mrr: 3999, status: "active", joined: "2026-02-18" },
  { id: 7, customer: "Fieldnote Co.", email: "team@fieldnote.co", plan: "Pro", mrr: 1499, status: "active", joined: "2026-03-03" },
  { id: 8, customer: "Saffron Foods", email: "accounts@saffron.in", plan: "Free", mrr: 0, status: "trialing", joined: "2026-04-28" },
];

/** Monthly recurring revenue for the last 12 months (sample data, in rupees). */
export const revenue = [6200, 6900, 7400, 7100, 8600, 9400, 9900, 10800, 11900, 12600, 13800, 14995];
export const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
`,
      "src/Chart.tsx": `/** Dependency-free SVG area chart. Scales to its container width. */
export function AreaChart({ values, labels }: { values: number[]; labels: string[] }) {
  const w = 640;
  const h = 200;
  const pad = 8;
  const max = Math.max(...values) * 1.1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (values.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const line = values.map((v, i) => (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const area = line + " L" + x(values.length - 1).toFixed(1) + " " + (h - pad) + " L" + x(0).toFixed(1) + " " + (h - pad) + " Z";
  const last = values.length - 1;
  return (
    <div>
      <svg viewBox={"0 0 " + w + " " + h} className="h-52 w-full" preserveAspectRatio="none" role="img" aria-label="Monthly recurring revenue, last 12 months">
        <defs>
          <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke="rgb(226 232 240)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill="url(#fill)" />
        <path d={line} fill="none" stroke="rgb(79 70 229)" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={x(last)} cy={y(values[last])} r={4.5} fill="white" stroke="rgb(79 70 229)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between px-1 text-[11px] text-slate-400">
        {labels.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

/** Tiny trend line for stat cards. */
export function Sparkline({ values, tone = "rgb(79 70 229)" }: { values: number[]; tone?: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map((v, i) => (i * 100) / (values.length - 1) + "," + (28 - ((v - min) / (max - min || 1)) * 24).toFixed(1)).join(" ");
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-24" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={tone} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
`,
      "src/App.tsx": `import { useMemo, useState } from "react";
import { AreaChart, Sparkline } from "./Chart";
import { months, revenue, rows, type Plan, type Status } from "./data";

const nav = [
  { label: "Overview", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { label: "Customers", icon: "M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 10a3 3 0 100-6 3 3 0 000 6zM20 19v-1a3 3 0 00-2-2.8M16 4.2a3 3 0 010 5.6" },
  { label: "Revenue", icon: "M4 19h16M7 15v-4M12 15V7M17 15v-6" },
  { label: "Reports", icon: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" },
  { label: "Settings", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" },
];

const planTone: Record<Plan, string> = { Free: "bg-slate-100 text-slate-700", Pro: "bg-indigo-50 text-indigo-700", Team: "bg-violet-50 text-violet-700" };
const statusTone: Record<Status, string> = { active: "bg-emerald-500", trialing: "bg-amber-400", churned: "bg-rose-400" };
const avatarTone = ["bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-800", "bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700"];

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => rows.filter((r) => r.customer.toLowerCase().includes(query.toLowerCase())), [query]);
  const active = rows.filter((r) => r.status === "active");
  const mrr = active.reduce((s, r) => s + r.mrr, 0);
  const growth = ((revenue[revenue.length - 1] - revenue[revenue.length - 4]) / revenue[revenue.length - 4]) * 100;
  const plans: Plan[] = ["Team", "Pro", "Free"];
  const stats = [
    { label: "Active customers", value: String(active.length), trend: [3, 3, 4, 4, 5, 5, active.length] },
    { label: "Monthly revenue", value: inr(mrr), trend: revenue.slice(-7) },
    { label: "Trials", value: String(rows.filter((r) => r.status === "trialing").length), trend: [1, 2, 1, 3, 2, 2, 2] },
    { label: "Churned", value: String(rows.filter((r) => r.status === "churned").length), trend: [2, 2, 1, 1, 1, 1, 1], tone: "rgb(244 63 94)" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:grid md:grid-cols-[232px_1fr]">
      <aside className="flex flex-col border-b border-slate-200 bg-white px-4 py-5 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2.5 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-sm">A</span>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Acme Analytics</div>
            <div className="text-xs text-slate-500">Production</div>
          </div>
        </div>
        <nav className="mt-8 space-y-0.5 text-sm" aria-label="Main">
          {nav.map((item, i) => (
            <a
              key={item.label}
              href="#"
              aria-current={i === 0 ? "page" : undefined}
              className={"flex items-center gap-3 rounded-lg px-3 py-2 transition " + (i === 0 ? "bg-slate-900 font-medium text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
            >
              <Icon d={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto hidden rounded-xl border border-slate-200 bg-slate-50 p-3 md:block">
          <div className="text-xs font-medium">Sample data</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Replace src/data.ts with your API to see real numbers.</p>
        </div>
      </aside>

      <main className="min-w-0 p-6 lg:p-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Last 12 months</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Overview</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium shadow-sm" role="group" aria-label="Range">
              {["7d", "30d", "12m"].map((r) => (
                <span key={r} className={"rounded-md px-2.5 py-1.5 " + (r === "12m" ? "bg-slate-900 text-white" : "text-slate-500")}>
                  {r}
                </span>
              ))}
            </div>
            <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium shadow-sm hover:bg-slate-50">
              Export CSV
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">{s.label}</div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
                <Sparkline values={s.trend} tone={s.tone} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="mrr-heading">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="mrr-heading" className="text-sm font-medium text-slate-500">Monthly recurring revenue</h2>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{inr(revenue[revenue.length - 1])}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">+{growth.toFixed(1)}% in 3 months</span>
            </div>
            <div className="mt-4">
              <AreaChart values={revenue} labels={months} />
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="mix-heading">
            <h2 id="mix-heading" className="text-sm font-medium text-slate-500">Plan mix</h2>
            <ul className="mt-5 space-y-5">
              {plans.map((p) => {
                const count = rows.filter((r) => r.plan === p).length;
                return (
                  <li key={p}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{p}</span>
                      <span className="text-slate-500">{count} customers</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div className={"h-2 rounded-full " + (p === "Team" ? "bg-violet-500" : p === "Pro" ? "bg-indigo-500" : "bg-slate-300")} style={{ width: (count / rows.length) * 100 + "%" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">Paid plans make up {Math.round((rows.filter((r) => r.plan !== "Free").length / rows.length) * 100)}% of accounts.</p>
          </section>
        </div>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="customers-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 id="customers-heading" className="font-medium">
              Customers <span className="ml-1 text-sm font-normal text-slate-400">{filtered.length}</span>
            </h2>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers…" className="w-56 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" aria-label="Search customers" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 text-right font-medium">MRR</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className={"grid h-8 w-8 place-items-center rounded-full text-xs font-semibold " + avatarTone[r.id % avatarTone.length]}>{r.customer.slice(0, 2).toUpperCase()}</span>
                        <div>
                          <div className="font-medium">{r.customer}</div>
                          <div className="text-xs text-slate-500">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={"rounded-md px-2 py-0.5 text-xs font-medium " + planTone[r.plan]}>{r.plan}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{inr(r.mrr)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 capitalize text-slate-600">
                        <span className={"h-2 w-2 rounded-full " + statusTone[r.status]} />
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{new Date(r.joined).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">No customers match “{query}”.</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
`,
    },
  },
  {
    id: "vite-react-landing",
    name: "Product landing page",
    description: "A conversion-focused landing page with hero, features, pricing, and FAQ sections.",
    longDescription:
      "A single-file React landing page with header, hero and product art drawn in CSS, six feature cards, a three-tier pricing grid, an FAQ and a footer. All copy is placeholder text you replace by prompting Codexa. Good for trying the AI agent on layout and tone changes.",
    category: "landing-pages",
    tags: ["react", "landing", "marketing", "tailwind"],
    framework: "vite-react",
    dependencies: deps,
    settings,
    prebuilt: true,
    difficulty: "beginner",
    previewPath: "/",
    files: {
      ...viteBase({
        name: "codexa-landing",
        title: "Launchpad — Plan, ship and announce every release",
        readme: readme("Product landing page", "A single-file React landing page: hero with CSS product art, features, pricing and FAQ. All copy is placeholder text; ask Codexa to rewrite it for your product and audience."),
      }),
      "src/App.tsx": `const features = [
  { title: "Roadmap and releases together", body: "Plan the next release next to what shipped last week, so nothing falls between the cracks.", icon: "M4 6h16M4 12h10M4 18h6" },
  { title: "Launch checklists", body: "Reusable checklists for docs, QA and announcements. Every item has an owner.", icon: "M9 11l3 3 8-8M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" },
  { title: "Changelog that writes itself", body: "Merged work becomes draft release notes you edit, not start from scratch.", icon: "M4 4h16v12H5.2L4 17.2V4zM8 9h8M8 12h5" },
  { title: "Status for stakeholders", body: "A read-only page that answers “when is it shipping?” before anyone asks.", icon: "M12 3v18M3 12h18M5.6 5.6l12.8 12.8" },
  { title: "Works with your tools", body: "Import issues, link pull requests and post updates where your team already talks.", icon: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" },
  { title: "Private by default", body: "Workspaces, roles and an audit trail. Share only what you choose.", icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" },
];

const tiers = [
  { name: "Free", price: "₹0", note: "For trying it out", items: ["1 project", "Public roadmap", "Community support"] },
  { name: "Pro", price: "₹999", note: "per month", items: ["Unlimited projects", "Launch checklists", "Changelog drafts", "Email support"], highlight: true },
  { name: "Team", price: "₹2,999", note: "per month", items: ["Everything in Pro", "10 seats", "Roles and audit log"] },
];

const faqs = [
  ["Is there a free plan?", "Yes. The Free plan is free forever for one project. Replace these answers with your own."],
  ["Can I import my existing issues?", "Describe the import you need and ask Codexa to wire it to your backend."],
  ["How do I cancel?", "Any time, from settings. Your data stays exportable."],
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Product art drawn with plain elements, so there are no image files to replace. */
function ProductArt() {
  const cols = [
    { title: "Planned", cards: ["Billing page redesign", "Usage alerts"], tone: "bg-slate-300" },
    { title: "In progress", cards: ["Team invites", "Dark mode", "CSV export"], tone: "bg-amber-400" },
    { title: "Shipped", cards: ["SSO for Team plans", "Faster search"], tone: "bg-emerald-500" },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto mt-16 max-w-5xl">
      <div className="absolute -inset-x-10 -top-10 bottom-0 rounded-[3rem] bg-gradient-to-b from-indigo-200/60 via-violet-100/40 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-indigo-900/10">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-4 rounded-md bg-white px-3 py-1 text-xs text-slate-400 shadow-sm">launchpad.app/acme/releases</span>
        </div>
        <div className="grid grid-cols-[180px_1fr]">
          <div className="border-r border-slate-100 p-4 text-left text-xs">
            <div className="font-semibold text-slate-900">Acme</div>
            {["Releases", "Roadmap", "Checklists", "Changelog"].map((l, i) => (
              <div key={l} className={"mt-2 rounded-md px-2 py-1.5 " + (i === 0 ? "bg-indigo-50 font-medium text-indigo-700" : "text-slate-500")}>
                {l}
              </div>
            ))}
          </div>
          <div className="p-5 text-left">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Release</div>
                <div className="text-sm font-semibold text-slate-900">v2.4 · Spring launch</div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">On track</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {cols.map((c) => (
                <div key={c.title} className="rounded-xl bg-slate-50 p-2.5">
                  <div className="flex items-center gap-1.5 px-1 text-[11px] font-medium text-slate-500">
                    <span className={"h-1.5 w-1.5 rounded-full " + c.tone} />
                    {c.title}
                  </div>
                  {c.cards.map((card) => (
                    <div key={card} className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] font-medium text-slate-700 shadow-sm">
                      {card}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="h-1.5 w-10 rounded-full bg-slate-100" />
                        <span className="h-4 w-4 rounded-full bg-gradient-to-br from-indigo-300 to-violet-300" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#" className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 text-xs text-white">L</span>
            Launchpad
          </a>
          <nav className="hidden items-center gap-8 text-sm text-slate-600 sm:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <a href="#pricing" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800">Get started</a>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 pb-24 pt-20 text-center">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(224_231_255),transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <a href="#features" className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm">
            <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white">New</span>
            Launch checklists are here →
          </a>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
            Plan, ship and announce <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">every release.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-lg leading-relaxed text-slate-600">Launchpad keeps your roadmap, changelog and launch checklist in one calm place. Replace this copy with your own value proposition.</p>
          <div className="mt-8 flex justify-center gap-3">
            <a href="#pricing" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">Start free</a>
            <a href="#features" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium shadow-sm hover:bg-slate-50">See how it works</a>
          </div>
        </div>
        <ProductArt />
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-sm font-semibold text-indigo-600">Features</p>
        <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight">Everything a release needs, nothing it does not.</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 p-6 transition hover:border-slate-300 hover:shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon d={f.icon} />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Simple pricing</h2>
          <p className="mt-3 text-center text-slate-600">Placeholder tiers. Connect a payment provider before charging anyone.</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {tiers.map((t) => (
              <div key={t.name} className={"flex flex-col rounded-2xl border bg-white p-7 " + (t.highlight ? "border-indigo-600 shadow-xl shadow-indigo-600/10 ring-1 ring-indigo-600" : "border-slate-200")}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{t.name}</h3>
                  {t.highlight ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Popular</span> : null}
                </div>
                <p className="mt-4">
                  <span className="text-4xl font-semibold tracking-tight">{t.price}</span> <span className="text-sm text-slate-500">{t.note}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-600">
                  {t.items.map((i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-indigo-600">✓</span>
                      {i}
                    </li>
                  ))}
                </ul>
                <a href="#" className={"mt-8 rounded-xl px-4 py-2.5 text-center text-sm font-medium " + (t.highlight ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-200 hover:bg-slate-50")}>
                  Choose {t.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight">Questions</h2>
        <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {q}
                <span className="text-slate-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-slate-500">
          <span>© {new Date().getFullYear()} Launchpad</span>
          <span>Built with Codexa</span>
        </div>
      </footer>
    </div>
  );
}
`,
    },
  },
];
