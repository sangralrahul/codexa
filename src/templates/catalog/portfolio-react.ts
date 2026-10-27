import type { Template } from "../types";
import { VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-portfolio",
    title: "Arjun Nair — Full-stack developer",
    readme: `# React portfolio

A one-page developer portfolio with a project filter, an about section and a contact form that opens your mail client.
Edit \`src/data.ts\` to replace the sample name, links and projects with your own.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  }),
  "src/data.ts": `export type Project = { title: string; summary: string; tags: string[]; url?: string; year: string; tone: string };

/** Sample profile: replace every field with your own. */
export const profile = {
  name: "Arjun Nair",
  role: "Full-stack developer",
  intro: "I build web applications with React, Node and PostgreSQL, mostly for small teams that need software to fit how they already work. Replace this with two sentences about what you do.",
  email: "you@example.com",
  location: "Bengaluru · Remote",
  links: [
    { label: "GitHub", href: "https://github.com/your-handle" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/your-handle" },
  ],
};

export const projects: Project[] = [
  { title: "Inventory tracker", summary: "Barcode scanning and low-stock alerts for a small warehouse.", tags: ["React", "Node"], year: "2026", tone: "from-sky-400 to-indigo-500" },
  { title: "Clinic scheduler", summary: "Appointment booking with reminders and a staff calendar.", tags: ["TypeScript", "PostgreSQL"], year: "2025", tone: "from-emerald-400 to-teal-600" },
  { title: "Design tokens CLI", summary: "Generates CSS variables and Tailwind themes from a JSON source.", tags: ["Node", "Tooling"], year: "2025", tone: "from-amber-300 to-orange-500" },
  { title: "Expense approvals", summary: "Two-step approvals with receipts and a monthly export.", tags: ["React", "PostgreSQL"], year: "2024", tone: "from-fuchsia-400 to-violet-600" },
];

export const skills = ["React", "TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS", "Testing", "Accessibility"];
`,
  "src/App.tsx": `import { useMemo, useState } from "react";
import { profile, projects, skills } from "./data";

function Cover({ tone }: { tone: string }) {
  return (
    <div aria-hidden="true" className={"relative h-40 overflow-hidden rounded-xl bg-gradient-to-br " + tone}>
      <div className="absolute left-6 right-10 top-6 rounded-lg bg-white/90 p-3 shadow-xl shadow-black/10">
        <div className="h-2 w-16 rounded-full bg-slate-300" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="h-8 rounded-md bg-slate-100" />
          <div className="h-8 rounded-md bg-slate-100" />
          <div className="h-8 rounded-md bg-slate-200" />
        </div>
        <div className="mt-2 h-2 w-3/4 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

export default function App() {
  const tags = useMemo(() => Array.from(new Set(projects.flatMap((p) => p.tags))).sort(), []);
  const [active, setActive] = useState<string | null>(null);
  const visible = active ? projects.filter((p) => p.tags.includes(active)) : projects;
  const mailto = "mailto:" + profile.email;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <a href="#top" className="flex items-center gap-2.5 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-stone-900 text-xs text-white">{profile.name.split(" ").map((p) => p[0]).join("")}</span>
          {profile.name}
        </a>
        <nav className="flex gap-1 text-sm" aria-label="Sections">
          {["Work", "About", "Contact"].map((l) => (
            <a key={l} href={"#" + l.toLowerCase()} className="rounded-full px-3 py-1.5 text-stone-600 hover:bg-stone-200/60 hover:text-stone-900">
              {l}
            </a>
          ))}
        </nav>
      </header>

      <main id="top" className="mx-auto max-w-5xl px-6 pb-20">
        <section className="grid items-end gap-10 py-14 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-600 shadow-sm ring-1 ring-stone-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Open to new projects
            </p>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
              {profile.role},
              <br />
              <span className="text-stone-400">building calm software.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">{profile.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#contact" className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700">
                Get in touch
              </a>
              {profile.links.map((l) => (
                <a key={l.label} href={l.href} className="rounded-full border border-stone-300 px-4 py-2.5 text-sm hover:bg-white" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <aside className="rounded-3xl bg-stone-900 p-6 text-stone-300 shadow-2xl shadow-stone-900/20">
            <p className="font-mono text-xs text-stone-500">// now.ts</p>
            <pre className="mt-3 overflow-x-auto font-mono text-[13px] leading-relaxed">
              <span className="text-violet-300">const</span> <span className="text-sky-300">now</span> = {"{"}
              {"\\n"}  building: <span className="text-emerald-300">"tools for clinics"</span>,
              {"\\n"}  based: <span className="text-emerald-300">"{profile.location}"</span>,
              {"\\n"}  stack: [<span className="text-emerald-300">"React"</span>, <span className="text-emerald-300">"Postgres"</span>],
              {"\\n"}{"}"};
            </pre>
          </aside>
        </section>

        <section id="work" aria-labelledby="work-title" className="pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="work-title" className="text-2xl font-semibold tracking-tight">
              Selected work
            </h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter projects by tag">
              <button type="button" onClick={() => setActive(null)} aria-pressed={active === null} className={"rounded-full border px-3 py-1 text-xs " + (active === null ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white")}>
                All
              </button>
              {tags.map((t) => (
                <button key={t} type="button" onClick={() => setActive(t)} aria-pressed={active === t} className={"rounded-full border px-3 py-1 text-xs " + (active === t ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {visible.map((p) => (
              <li key={p.title} className="group rounded-2xl border border-stone-200 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-stone-900/5">
                <Cover tone={p.tone} />
                <div className="px-2 pb-2 pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold">{p.url ? <a href={p.url}>{p.title}</a> : p.title}</h3>
                    <span className="text-xs tabular-nums text-stone-400">{p.year}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{p.summary}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Technologies">
                    {p.tags.map((t) => (
                      <li key={t} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-700">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="about" className="mt-24 grid gap-8 md:grid-cols-[1fr_1.4fr]" aria-labelledby="about-title">
          <h2 id="about-title" className="text-2xl font-semibold tracking-tight">
            About
          </h2>
          <div>
            <p className="text-lg leading-relaxed text-stone-600">
              Write a short paragraph about your background, the kind of problems you enjoy, and what you are looking for. Keep it honest and specific.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Skills">
              {skills.map((s) => (
                <li key={s} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="contact" className="mt-24 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200 sm:p-10" aria-labelledby="contact-title">
          <h2 id="contact-title" className="text-2xl font-semibold tracking-tight">
            Contact
          </h2>
          <p className="mt-2 text-stone-600">This form opens your email client; no data is sent anywhere else.</p>
          <form
            className="mt-6 grid max-w-xl gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const subject = encodeURIComponent("Hello from " + String(data.get("name") ?? ""));
              const body = encodeURIComponent(String(data.get("message") ?? ""));
              window.location.href = mailto + "?subject=" + subject + "&body=" + body;
            }}
          >
            <label className="block text-sm">
              <span className="font-medium">Your name</span>
              <input name="name" required className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 outline-none focus:border-stone-500" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Message</span>
              <textarea name="message" required rows={4} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 outline-none focus:border-stone-500" />
            </label>
            <button type="submit" className="w-fit rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700">
              Send email
            </button>
          </form>
        </section>
      </main>
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        © {new Date().getFullYear()} {profile.name}
      </footer>
    </div>
  );
}
`,
};

export const portfolioReactTemplate: Template = {
  id: "vite-react-portfolio",
  name: "Developer portfolio (React)",
  description: "A one-page portfolio with a tag-filtered project grid, about section, and a mailto contact form.",
  longDescription:
    "All content lives in src/data.ts (profile, links, projects) so updating the site is a data change. The project grid filters by technology tag with accessible toggle buttons, and the contact form composes a mailto link instead of posting anywhere — no backend needed to deploy it to Codexa static hosting.",
  category: "portfolios",
  tags: ["react", "portfolio", "personal-site", "tailwind"],
  framework: "vite-react",
  dependencies: VITE_DEPS,
  settings: VITE_SETTINGS,
  prebuilt: true,
  difficulty: "beginner",
  previewPath: "/",
  files,
};
