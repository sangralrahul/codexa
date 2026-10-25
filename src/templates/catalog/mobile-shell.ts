import type { Template } from "../types";
import { VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-mobile-shell",
    title: "Mobile app shell",
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
  { id: "home", label: "Home", icon: "⌂" },
  { id: "search", label: "Search", icon: "⌕" },
  { id: "activity", label: "Activity", icon: "◷" },
  { id: "profile", label: "Profile", icon: "◯" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [tab, setTab] = useState<TabId>("home");
  const title = TABS.find((t) => t.id === tab)?.label ?? "";
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white text-slate-900 shadow-xl sm:my-4 sm:min-h-[calc(100vh-2rem)] sm:rounded-[2rem] sm:border sm:border-slate-200">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <h1 className="text-lg font-semibold">{title}</h1>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-4" role="tabpanel" aria-label={title}>
        {tab === "home" ? <Home /> : tab === "search" ? <Search /> : tab === "activity" ? <Activity /> : <Profile />}
      </main>
      <nav className="sticky bottom-0 z-10 grid grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]" aria-label="Primary">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={"flex flex-col items-center gap-0.5 py-2 text-xs " + (tab === t.id ? "text-blue-600" : "text-slate-500 hover:text-slate-900")}
          >
            <span aria-hidden="true" className="text-xl leading-none">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
`,
  "src/screens/Home.tsx": `export function Home() {
  const cards = [
    { title: "Today", body: "3 tasks due · 1 meeting at 15:00" },
    { title: "Weather", body: "Replace with a fetch to a weather API." },
    { title: "Tip", body: "Ask Codexa to add a new tab or screen." },
  ];
  return (
    <div className="space-y-3">
      {cards.map((c) => (
        <section key={c.title} className="rounded-2xl border border-slate-200 p-4">
          <h2 className="font-medium">{c.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{c.body}</p>
        </section>
      ))}
      <button type="button" className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-medium text-white active:bg-blue-700">
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
      <input id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base" autoComplete="off" />
      <ul className="mt-4 divide-y divide-slate-100">
        {results.map((r) => (
          <li key={r} className="py-3 text-sm">
            {r}
          </li>
        ))}
        {results.length === 0 ? <li className="py-6 text-center text-sm text-slate-500">No results</li> : null}
      </ul>
    </div>
  );
}
`,
  "src/screens/Activity.tsx": `const events = [
  { id: 1, text: "You completed “Set up project”", when: "2m ago" },
  { id: 2, text: "Priya commented on “Launch plan”", when: "1h ago" },
  { id: 3, text: "Weekly summary is ready", when: "Yesterday" },
];

export function Activity() {
  return (
    <ol className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3 rounded-2xl border border-slate-200 p-4">
          <span aria-hidden="true" className="mt-1 size-2 shrink-0 rounded-full bg-blue-500" />
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
        <div aria-hidden="true" className="size-16 rounded-full bg-slate-200" />
        <div>
          <p className="font-medium">Your name</p>
          <p className="text-sm text-slate-500">you@example.com</p>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
        <li className="flex items-center justify-between p-4 text-sm">
          <span>Dark mode (wire to a theme)</span>
          <button type="button" role="switch" aria-checked={dark} onClick={() => setDark((d) => !d)} className={"h-6 w-11 rounded-full transition " + (dark ? "bg-blue-600" : "bg-slate-300")}>
            <span className={"block size-5 translate-x-0.5 rounded-full bg-white transition " + (dark ? "translate-x-5" : "")} />
          </button>
        </li>
        <li className="flex items-center justify-between p-4 text-sm">
          <span>Notifications</span>
          <button type="button" role="switch" aria-checked={notify} onClick={() => setNotify((n) => !n)} className={"h-6 w-11 rounded-full transition " + (notify ? "bg-blue-600" : "bg-slate-300")}>
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
