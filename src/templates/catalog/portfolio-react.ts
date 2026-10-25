import type { Template } from "../types";
import { VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-portfolio",
    title: "Portfolio",
    readme: `# React portfolio

A one-page developer portfolio with a project filter, an about section and a contact form that opens your mail client.
Edit \`src/data.ts\` to add your own projects.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  }),
  "src/data.ts": `export type Project = { title: string; summary: string; tags: string[]; url?: string };

export const profile = {
  name: "Your Name",
  role: "Full-stack developer",
  intro: "I build web applications with React, Node and PostgreSQL. Replace this with two sentences about what you do.",
  email: "you@example.com",
  links: [
    { label: "GitHub", href: "https://github.com/your-handle" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/your-handle" },
  ],
};

export const projects: Project[] = [
  { title: "Inventory tracker", summary: "Barcode scanning and low-stock alerts for a small warehouse.", tags: ["React", "Node"] },
  { title: "Clinic scheduler", summary: "Appointment booking with reminders and a staff calendar.", tags: ["TypeScript", "PostgreSQL"] },
  { title: "Design tokens CLI", summary: "Generates CSS variables and Tailwind themes from a JSON source.", tags: ["Node", "Tooling"] },
];
`,
  "src/App.tsx": `import { useMemo, useState } from "react";
import { profile, projects } from "./data";

export default function App() {
  const tags = useMemo(() => Array.from(new Set(projects.flatMap((p) => p.tags))).sort(), []);
  const [active, setActive] = useState<string | null>(null);
  const visible = active ? projects.filter((p) => p.tags.includes(active)) : projects;
  const mailto = "mailto:" + profile.email;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <a href="#top" className="font-semibold">
          {profile.name}
        </a>
        <nav className="flex gap-4 text-sm" aria-label="Sections">
          <a href="#work" className="hover:underline">
            Work
          </a>
          <a href="#about" className="hover:underline">
            About
          </a>
          <a href="#contact" className="hover:underline">
            Contact
          </a>
        </nav>
      </header>

      <main id="top" className="mx-auto max-w-4xl px-6 pb-20">
        <section className="py-16">
          <p className="text-sm uppercase tracking-widest text-stone-500">{profile.role}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{profile.name}</h1>
          <p className="mt-4 max-w-xl text-lg text-stone-600">{profile.intro}</p>
          <div className="mt-6 flex gap-3">
            {profile.links.map((l) => (
              <a key={l.label} href={l.href} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-white" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </div>
        </section>

        <section id="work" aria-labelledby="work-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="work-title" className="text-2xl font-semibold">
              Selected work
            </h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter projects by tag">
              <button type="button" onClick={() => setActive(null)} aria-pressed={active === null} className={"rounded-full border px-3 py-1 text-xs " + (active === null ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300")}>
                All
              </button>
              {tags.map((t) => (
                <button key={t} type="button" onClick={() => setActive(t)} aria-pressed={active === t} className={"rounded-full border px-3 py-1 text-xs " + (active === t ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {visible.map((p) => (
              <li key={p.title} className="rounded-xl border border-stone-200 bg-white p-5">
                <h3 className="font-medium">{p.url ? <a href={p.url}>{p.title}</a> : p.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{p.summary}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Technologies">
                  {p.tags.map((t) => (
                    <li key={t} className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                      {t}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section id="about" className="mt-20" aria-labelledby="about-title">
          <h2 id="about-title" className="text-2xl font-semibold">
            About
          </h2>
          <p className="mt-4 max-w-2xl text-stone-600">
            Write a short paragraph about your background, the kind of problems you enjoy, and what you are looking for. Keep it honest and specific.
          </p>
        </section>

        <section id="contact" className="mt-20" aria-labelledby="contact-title">
          <h2 id="contact-title" className="text-2xl font-semibold">
            Contact
          </h2>
          <p className="mt-2 text-stone-600">This form opens your email client; no data is sent anywhere else.</p>
          <form
            className="mt-4 max-w-md space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const subject = encodeURIComponent("Hello from " + String(data.get("name") ?? ""));
              const body = encodeURIComponent(String(data.get("message") ?? ""));
              window.location.href = mailto + "?subject=" + subject + "&body=" + body;
            }}
          >
            <label className="block text-sm">
              <span>Your name</span>
              <input name="name" required className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span>Message</span>
              <textarea name="message" required rows={4} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" />
            </label>
            <button type="submit" className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white">
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
