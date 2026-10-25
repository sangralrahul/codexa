import type { Template } from "./types";

const base = {
  "package.json": JSON.stringify(
    {
      name: "codexa-app",
      private: true,
      version: "0.1.0",
      type: "module",
      scripts: { dev: "vite --host 0.0.0.0 --port $PORT", build: "tsc -b && vite build", preview: "vite preview --host 0.0.0.0 --port $PORT" },
      dependencies: { react: "^19.1.0", "react-dom": "^19.1.0" },
      devDependencies: {
        "@types/react": "^19.1.0",
        "@types/react-dom": "^19.1.0",
        "@vitejs/plugin-react": "^4.4.0",
        "@tailwindcss/vite": "^4.1.0",
        tailwindcss: "^4.1.0",
        typescript: "^5.8.0",
        vite: "^6.3.0",
      },
    },
    null,
    2,
  ),
  "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: process.env.CODEXA_PREVIEW_HOST
      ? { host: process.env.CODEXA_PREVIEW_HOST, clientPort: Number(process.env.CODEXA_PREVIEW_PORT) || 80, protocol: "ws" }
      : undefined,
  },
});
`,
  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: "ESNext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        isolatedModules: true,
        allowImportingTsExtensions: true,
        types: ["vite/client"],
      },
      include: ["src"],
    },
    null,
    2,
  ),
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Codexa App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  "src/main.tsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`,
  "src/index.css": `@import "tailwindcss";

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}
`,
  "README.md": `# Codexa app

Generated with Codexa. Run locally:

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  ".gitignore": `node_modules\ndist\n.env\n`,
};

const settings = { devCommand: "npm run dev", buildCommand: "npm run build", installCommand: "npm install", outputDir: "dist", port: 5173 };
const deps = { react: "^19.1.0", "react-dom": "^19.1.0", vite: "^6.3.0", tailwindcss: "^4.1.0", typescript: "^5.8.0" };

export const viteReactTemplates: Template[] = [
  {
    id: "vite-react-starter",
    name: "React starter",
    description: "A clean React + TypeScript + Tailwind single-page app. The default target for AI generation.",
    category: "web-apps",
    tags: ["react", "typescript", "tailwind", "vite", "spa"],
    framework: "vite-react",
    dependencies: deps,
    settings,
    prebuilt: true,
    featured: true,
    difficulty: "beginner",
    files: {
      ...base,
      "src/App.tsx": `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-semibold tracking-tight">Hello from Codexa</h1>
        <p className="mt-2 text-slate-600">
          This is your starting point. Describe what you want to build in the chat and Codexa will edit these files.
        </p>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Clicked {count} {count === 1 ? "time" : "times"}
        </button>
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
    category: "dashboards",
    tags: ["react", "dashboard", "tailwind", "table"],
    framework: "vite-react",
    dependencies: deps,
    settings,
    prebuilt: true,
    featured: true,
    difficulty: "intermediate",
    files: {
      ...base,
      "src/App.tsx": `import { useMemo, useState } from "react";

type Row = { id: number; customer: string; plan: "Free" | "Pro" | "Team"; mrr: number; status: "active" | "trialing" | "churned" };

const rows: Row[] = [
  { id: 1, customer: "Aarav Studio", plan: "Pro", mrr: 1499, status: "active" },
  { id: 2, customer: "Nimbus Labs", plan: "Team", mrr: 3999, status: "active" },
  { id: 3, customer: "Priya Designs", plan: "Free", mrr: 0, status: "trialing" },
  { id: 4, customer: "Orbit Retail", plan: "Pro", mrr: 1499, status: "churned" },
  { id: 5, customer: "Kavya Tech", plan: "Team", mrr: 3999, status: "active" },
];

export default function App() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => rows.filter((r) => r.customer.toLowerCase().includes(query.toLowerCase())), [query]);
  const mrr = rows.filter((r) => r.status === "active").reduce((s, r) => s + r.mrr, 0);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-slate-200 bg-white p-4 md:border-b-0 md:border-r">
        <div className="text-sm font-semibold tracking-wide">ACME ANALYTICS</div>
        <nav className="mt-6 space-y-1 text-sm">
          {["Overview", "Customers", "Revenue", "Settings"].map((item, i) => (
            <a key={item} href="#" className={"block rounded-md px-3 py-2 " + (i === 0 ? "bg-slate-100 font-medium" : "text-slate-600 hover:bg-slate-50")}>
              {item}
            </a>
          ))}
        </nav>
      </aside>
      <main className="p-6">
        <h1 className="text-xl font-semibold">Overview</h1>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ["Active customers", String(rows.filter((r) => r.status === "active").length)],
            ["Monthly revenue", "₹" + mrr.toLocaleString("en-IN")],
            ["Trials", String(rows.filter((r) => r.status === "trialing").length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
              <div className="mt-1 text-2xl font-semibold">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <h2 className="font-medium">Customers</h2>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" aria-label="Search customers" />
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr><th className="p-3">Customer</th><th className="p-3">Plan</th><th className="p-3">MRR</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{r.customer}</td>
                  <td className="p-3">{r.plan}</td>
                  <td className="p-3">₹{r.mrr.toLocaleString("en-IN")}</td>
                  <td className="p-3 capitalize">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    category: "landing-pages",
    tags: ["react", "landing", "marketing", "tailwind"],
    framework: "vite-react",
    dependencies: deps,
    settings,
    prebuilt: true,
    difficulty: "beginner",
    files: {
      ...base,
      "src/App.tsx": `export default function App() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="font-semibold">Launchpad</span>
        <a href="#pricing" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Get started</a>
      </header>
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Ship your product faster</h1>
        <p className="mt-4 text-lg text-slate-600">Replace this copy with your value proposition. Ask Codexa to adjust tone, sections, and layout.</p>
        <div className="mt-8 flex justify-center gap-3">
          <a href="#pricing" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white">Start free</a>
          <a href="#features" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium">Learn more</a>
        </div>
      </section>
      <section id="features" className="mx-auto grid max-w-5xl gap-6 px-6 pb-20 sm:grid-cols-3">
        {["Fast setup", "Secure by default", "Scales with you"].map((f) => (
          <div key={f} className="rounded-xl border border-slate-200 p-6">
            <h3 className="font-medium">{f}</h3>
            <p className="mt-2 text-sm text-slate-600">Short description of this feature and why it matters.</p>
          </div>
        ))}
      </section>
      <section id="pricing" className="bg-slate-50 py-20">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 sm:grid-cols-3">
          {[["Free", "₹0"], ["Pro", "₹999/mo"], ["Team", "₹2,999/mo"]].map(([name, price]) => (
            <div key={name} className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-medium">{name}</h3>
              <p className="mt-2 text-2xl font-semibold">{price}</p>
              <a href="#" className="mt-6 block rounded-lg bg-slate-900 px-4 py-2 text-center text-sm text-white">Choose {name}</a>
            </div>
          ))}
        </div>
      </section>
      <footer className="mx-auto max-w-5xl px-6 py-10 text-sm text-slate-500">© {new Date().getFullYear()} Launchpad</footer>
    </div>
  );
}
`,
    },
  },
];
