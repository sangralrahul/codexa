import type { Template } from "../types";
import { VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-mobile-shell",
    title: "Daybook",
    readme: `# Mobile-first app shell

A phone-first layout with a fixed bottom tab bar, a top app bar, and four tab screens.
Safe-area insets are respected so it looks right when installed to a home screen.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  }),
  "src/App.tsx": `import { useState } from "react";
import { Home } from "./screens/Home";
import { Search } from "./screens/Search";
import { Activity } from "./screens/Activity";
import { Profile } from "./screens/Profile";

const TABS = [
  { id: "home", label: "Home", icon: "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" },
  { id: "search", label: "Search", icon: "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-3.5-3.5" },
  { id: "activity", label: "Activity", icon: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2" },
  { id: "profile", label: "Profile", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [tab, setTab] = useState<TabId>("home");
  const title = TABS.find((t) => t.id === tab)?.label ?? "";
  return (
    <div className="min-h-screen bg-[radial-gradient(80%_60%_at_20%_10%,#ffedd5,transparent_60%),radial-gradient(60%_50%_at_90%_90%,#fce7f3,transparent_60%)] bg-slate-50 sm:flex sm:items-center sm:justify-center sm:gap-16 sm:p-6">
      <div className="hidden max-w-xs lg:block">
        <p className="text-sm font-semibold text-orange-600">Mobile-first app shell</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">Daybook</h2>
        <p className="mt-4 leading-relaxed text-slate-600">Designed for phones first. On larger screens it is framed like a device; open it on your phone or install it to the home screen.</p>
        <ul className="mt-6 space-y-2 text-sm text-slate-600">
          <li>✓ Bottom tab bar with aria-current</li>
          <li>✓ Safe-area insets for installed apps</li>
          <li>✓ Four example screens</li>
        </ul>
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-white text-slate-900 sm:mx-0 sm:min-h-0 sm:h-[min(860px,calc(100vh-3rem))] sm:w-[400px] sm:rounded-[2.5rem] sm:border-[10px] sm:border-slate-900 sm:shadow-2xl sm:shadow-orange-900/20">
        <header className="sticky top-0 z-10 bg-white/90 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <span aria-hidden="true" className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-pink-400" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-5 pb-4" role="tabpanel" aria-label={title}>
          {tab === "home" ? <Home /> : tab === "search" ? <Search /> : tab === "activity" ? <Activity /> : <Profile />}
        </main>
        <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-slate-100 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur" aria-label="Primary">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={"flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition " + (tab === t.id ? "text-orange-600" : "text-slate-400 hover:text-slate-700")}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill={tab === t.id ? "currentColor" : "none"} fillOpacity={0.12} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
`,
  "src/screens/Home.tsx": `const upNext = [
  { time: "09:30", title: "Stand-up", tone: "bg-orange-500" },
  { time: "12:00", title: "Lunch with Priya", tone: "bg-amber-400" },
  { time: "15:00", title: "Design review", tone: "bg-pink-500" },
];

export function Home() {
  const done = 3;
  const total = 5;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Good morning. Here is your day.</p>
      <section className="flex items-center gap-5 rounded-3xl bg-gradient-to-br from-orange-600 to-orange-600 p-5 text-white shadow-lg shadow-orange-600/20">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="8" />
          <circle cx="40" cy="40" r={r} fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} />
        </svg>
        <div>
          <h2 className="text-lg font-semibold">Today</h2>
          <p className="text-sm text-orange-100">
            {done} of {total} tasks done · 1 meeting at 15:00
          </p>
        </div>
      </section>
      <section className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
        <h2 className="text-sm font-semibold">Up next</h2>
        <ul className="mt-3 space-y-2">
          {upNext.map((e) => (
            <li key={e.title} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <span className={"h-8 w-1 rounded-full " + e.tone} />
              <span className="w-12 text-xs tabular-nums text-slate-500">{e.time}</span>
              <span className="text-sm font-medium">{e.title}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-amber-50 p-4">
          <p className="text-xs text-amber-700">Weather</p>
          <p className="mt-1 text-2xl font-semibold">24°</p>
          <p className="text-xs text-amber-800/70">Replace with a weather API</p>
        </div>
        <div className="rounded-3xl bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700">Tip</p>
          <p className="mt-1 text-sm font-medium leading-snug text-emerald-900">Ask Codexa to add a new tab or screen.</p>
        </div>
      </section>
      <button type="button" className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-medium text-white active:bg-slate-700">
        Primary action
      </button>
    </div>
  );
}
`,
  "src/screens/Search.tsx": `import { useState } from "react";

const items = ["Onboarding checklist", "Invoices", "Team directory", "Release notes", "Support inbox", "Settings"];

export function Search() {
  const [q, setQ] = useState("");
  const results = items.filter((i) => i.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <label className="sr-only" htmlFor="search">
        Search
      </label>
      <input id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full rounded-2xl border-0 bg-slate-100 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-orange-400" autoComplete="off" />
      <ul className="mt-4 divide-y divide-slate-100">
        {results.map((r) => (
          <li key={r} className="flex items-center justify-between py-3.5 text-sm">
            {r}
            <span aria-hidden="true" className="text-slate-300">›</span>
          </li>
        ))}
        {results.length === 0 ? <li className="py-10 text-center text-sm text-slate-500">No results for “{q}”</li> : null}
      </ul>
    </div>
  );
}
`,
  "src/screens/Activity.tsx": `const events = [
  { id: 1, text: "You completed “Set up project”", when: "2m ago", tone: "bg-emerald-500" },
  { id: 2, text: "Priya commented on “Launch plan”", when: "1h ago", tone: "bg-orange-500" },
  { id: 3, text: "Weekly summary is ready", when: "Yesterday", tone: "bg-amber-400" },
];

export function Activity() {
  return (
    <ol className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <span aria-hidden="true" className={"mt-1.5 size-2 shrink-0 rounded-full " + e.tone} />
          <div>
            <p className="text-sm">{e.text}</p>
            <p className="mt-0.5 text-xs text-slate-500">{e.when}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
`,
  "src/screens/Profile.tsx": `import { useState } from "react";

export function Profile() {
  const [dark, setDark] = useState(false);
  const [notify, setNotify] = useState(true);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div aria-hidden="true" className="size-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-400" />
        <div>
          <p className="font-medium">Your name</p>
          <p className="text-sm text-slate-500">you@example.com</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
        <li className="flex items-center justify-between p-4 text-sm">
          <span>Dark mode (wire to a theme)</span>
          <button type="button" role="switch" aria-checked={dark} onClick={() => setDark((d) => !d)} className={"h-6 w-11 rounded-full transition " + (dark ? "bg-orange-600" : "bg-slate-300")}>
            <span className={"block size-5 translate-x-0.5 rounded-full bg-white transition " + (dark ? "translate-x-5" : "")} />
          </button>
        </li>
        <li className="flex items-center justify-between p-4 text-sm">
          <span>Notifications</span>
          <button type="button" role="switch" aria-checked={notify} onClick={() => setNotify((n) => !n)} className={"h-6 w-11 rounded-full transition " + (notify ? "bg-orange-600" : "bg-slate-300")}>
            <span className={"block size-5 translate-x-0.5 rounded-full bg-white transition " + (notify ? "translate-x-5" : "")} />
          </button>
        </li>
      </ul>
    </div>
  );
}
`,
};

export const mobileShellTemplate: Template = {
  id: "vite-react-mobile-shell",
  name: "Mobile app shell",
  description: "A phone-first layout with a sticky top bar, four tab screens, and a bottom navigation bar.",
  longDescription:
    "Designed at 360–430px first and framed as a phone on larger screens. Includes a bottom tab bar with aria-current, safe-area insets for installed web apps, and four example screens (home cards, a search list, an activity feed and a profile with accessible switches). No router dependency — tabs are component state.",
  category: "mobile-first",
  tags: ["react", "mobile", "pwa", "bottom-nav", "tailwind"],
  framework: "vite-react",
  dependencies: VITE_DEPS,
  settings: VITE_SETTINGS,
  prebuilt: true,
  difficulty: "beginner",
  previewPath: "/",
  files,
};
