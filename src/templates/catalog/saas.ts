import type { Template } from "../types";
import { HASH_ROUTER, USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-saas",
    title: "Acme — Projects your whole team can see",
    readme: `# SaaS starter

Multi-page single-page app with marketing pages, sign-in / sign-up screens and an authenticated app area.

**Authentication is mocked.** \`src/auth.tsx\` stores the "session" in localStorage so you can click through the flows.
Replace it with a real provider (your own API, Supabase Auth, Clerk, Auth0 ...) before shipping.

- \`src/pages/Landing.tsx\` and \`src/pages/Pricing.tsx\`: marketing pages
- \`src/pages/Auth.tsx\`: sign in and sign up (mock)
- \`src/pages/Dashboard.tsx\` and \`src/pages/Settings.tsx\`: the app area behind the mock session

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  }),
  "src/router.tsx": HASH_ROUTER,
  "src/useLocalStorage.ts": USE_LOCAL_STORAGE,
  "src/auth.tsx": `import { createContext, useContext, type ReactNode } from "react";
import { useLocalStorage } from "./useLocalStorage";

/**
 * MOCK AUTH — REPLACE WITH REAL AUTH BEFORE SHIPPING.
 * This stores a fake session in localStorage so the UI flows can be exercised locally.
 * It performs no password checks and offers no security at all.
 */
export type User = { email: string; name: string; plan: "free" | "pro" };

type AuthContextValue = {
  user: User | null;
  signIn: (email: string) => void;
  signUp: (name: string, email: string) => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useLocalStorage<User | null>("mock-session", null);
  const value: AuthContextValue = {
    user,
    signIn: (email) => setUser({ email, name: email.split("@")[0] ?? "You", plan: "free" }),
    signUp: (name, email) => setUser({ email, name, plan: "free" }),
    signOut: () => setUser(null),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
`,
  "src/App.tsx": `import { AuthProvider, useAuth } from "./auth";
import { useHashRoute } from "./router";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Pricing } from "./pages/Pricing";
import { SignIn, SignUp } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";

function Routes() {
  const path = useHashRoute("/");
  const { user } = useAuth();
  if (path.startsWith("/app")) {
    if (!user) return <SignIn redirectTo={path} />;
    if (path === "/app/settings") return <Settings />;
    return <Dashboard />;
  }
  switch (path) {
    case "/pricing":
      return <Pricing />;
    case "/signin":
      return <SignIn redirectTo="/app" />;
    case "/signup":
      return <SignUp />;
    default:
      return <Landing />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes />
      </Layout>
    </AuthProvider>
  );
}
`,
  "src/components/Layout.tsx": `import type { ReactNode } from "react";
import { Link } from "../router";
import { useAuth } from "../auth";

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-xs font-bold text-white shadow-sm shadow-blue-600/30">A</span>
      Acme
    </span>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/" className="hidden rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:block">
              Product
            </Link>
            <Link to="/pricing" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              Pricing
            </Link>
            {user ? (
              <>
                <Link to="/app" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                  Dashboard
                </Link>
                <button type="button" onClick={signOut} className="ml-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                  Sign in
                </Link>
                <Link to="/signup" className="ml-1 rounded-lg bg-slate-900 px-3.5 py-2 font-medium text-white shadow-sm hover:bg-slate-700">
                  Start free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      <footer className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-xs text-slate-500 sm:px-6">
          <span>© {new Date().getFullYear()} Acme, Inc.</span>
          <span>
            Mock authentication — replace <code className="rounded bg-slate-100 px-1 py-0.5">src/auth.tsx</code> with a real provider before launch.
          </span>
        </div>
      </footer>
    </div>
  );
}
`,
  "src/pages/Landing.tsx": `import { Link } from "../router";

const features = [
  { title: "Workspaces", body: "Invite teammates and give each person the right role.", icon: "M16 19v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 10a3 3 0 100-6 3 3 0 000 6zM20 19v-1a3 3 0 00-2-2.8" },
  { title: "Usage limits", body: "Metered plans enforced server-side, never in the browser.", icon: "M4 19h16M7 15v-4M12 15V7M17 15v-6" },
  { title: "Audit log", body: "Every change recorded with who, what and when.", icon: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" },
];

const board = [
  { name: "Website redesign", owner: "AK", progress: 72, tone: "bg-blue-500" },
  { name: "Mobile onboarding", owner: "MR", progress: 45, tone: "bg-cyan-500" },
  { name: "Billing migration", owner: "JS", progress: 18, tone: "bg-amber-400" },
];

/** A preview of the app area, drawn with plain elements. */
function AppPreview() {
  return (
    <div aria-hidden="true" className="relative">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-blue-100 via-cyan-50 to-transparent blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/10">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <span className="text-sm font-semibold">Projects</span>
          <span className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-white">New project</span>
        </div>
        <div className="grid grid-cols-3 gap-3 border-b border-slate-100 p-5">
          {[["Active", "12"], ["Due this week", "4"], ["Members", "9"]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 p-3">
              <div className="text-[11px] text-slate-500">{l}</div>
              <div className="mt-1 text-lg font-semibold">{v}</div>
            </div>
          ))}
        </div>
        <ul className="divide-y divide-slate-100">
          {board.map((p) => (
            <li key={p.name} className="flex items-center gap-4 px-5 py-3.5 text-sm">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">{p.owner}</span>
              <span className="flex-1 font-medium">{p.name}</span>
              <span className="h-1.5 w-28 rounded-full bg-slate-100">
                <span className={"block h-1.5 rounded-full " + p.tone} style={{ width: p.progress + "%" }} />
              </span>
              <span className="w-9 text-right text-xs tabular-nums text-slate-500">{p.progress}%</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-100 px-5 py-4 text-right text-xs text-slate-400">Showing 3 of 12</div>
      </div>
      <div className="absolute -bottom-5 -left-6 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
        <div className="text-[11px] text-slate-500">Audit log</div>
        <div className="mt-0.5 text-xs font-medium">Maya changed the plan to Pro</div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <>
      <section className="grid items-center gap-14 py-10 sm:py-16 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Now with role-based workspaces
          </span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-900 sm:text-[3.5rem] sm:leading-[1.05]">Projects your whole team can see.</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">Describe the outcome you deliver in one sentence. Ask Codexa to rewrite this hero, these features and the pricing for your audience.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
              Create account
            </Link>
            <Link to="/pricing" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium hover:bg-slate-50">
              See pricing
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-500">Free plan available · No card required</p>
        </div>
        <AppPreview />
      </section>
      <section className="grid gap-5 py-14 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={f.icon} />
              </svg>
            </span>
            <h2 className="mt-4 font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>
    </>
  );
}
`,
  "src/pages/Pricing.tsx": `import { Link } from "../router";

const tiers = [
  { name: "Free", price: "$0", note: "forever", features: ["1 workspace", "3 projects", "Community support"] },
  { name: "Pro", price: "$19", note: "per month", features: ["Unlimited projects", "Priority support", "Usage analytics"], highlight: true },
  { name: "Team", price: "$49", note: "per month", features: ["Everything in Pro", "5 seats", "Roles and audit log"] },
];

export function Pricing() {
  return (
    <section className="py-8">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
        <p className="mt-3 text-slate-600">Placeholder tiers. Connect a payment provider to make these real.</p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className={"flex flex-col rounded-2xl border bg-white p-7 " + (t.highlight ? "border-blue-600 shadow-xl shadow-blue-600/10 ring-1 ring-blue-600" : "border-slate-200")}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t.name}</h2>
              {t.highlight ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Popular</span> : null}
            </div>
            <p className="mt-4">
              <span className="text-4xl font-semibold tracking-tight">{t.price}</span> <span className="text-sm text-slate-500">{t.note}</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-600">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-blue-600">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/signup" className={"mt-8 rounded-xl px-4 py-2.5 text-center text-sm font-medium " + (t.highlight ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-slate-200 hover:bg-slate-50")}>
              Choose {t.name}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
`,
  "src/pages/Auth.tsx": `import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { Link, navigate } from "../router";

function MockNotice() {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
      <strong>Mock authentication.</strong> Any email is accepted and nothing is verified. Replace <code>src/auth.tsx</code> with real auth before shipping.
    </p>
  );
}

const field = "mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

export function SignIn({ redirectTo }: { redirectTo: string }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    signIn(email);
    navigate(redirectTo);
  }

  return (
    <form onSubmit={submit} className="mx-auto my-10 max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your workspace.</p>
      </div>
      <MockNotice />
      <label className="block text-sm">
        <span className="font-medium">Email</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className={field} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Password</span>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className={field} />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
        Sign in
      </button>
      <p className="text-center text-sm text-slate-600">
        No account? <Link to="/signup" className="font-medium text-blue-600">Sign up</Link>
      </p>
    </form>
  );
}

export function SignUp() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Enter your name.");
    if (!email.includes("@")) return setError("Enter a valid email address.");
    signUp(name.trim(), email);
    navigate("/app");
  }

  return (
    <form onSubmit={submit} className="mx-auto my-10 max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Free plan, no card required.</p>
      </div>
      <MockNotice />
      <label className="block text-sm">
        <span className="font-medium">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={field} />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Email</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className={field} />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
        Create account
      </button>
      <p className="text-center text-sm text-slate-600">
        Already registered? <Link to="/signin" className="font-medium text-blue-600">Sign in</Link>
      </p>
    </form>
  );
}
`,
  "src/pages/Dashboard.tsx": `import { useAuth } from "../auth";
import { Link } from "../router";

const projects = [
  { name: "Website redesign", status: "In progress", updated: "2 hours ago", progress: 72 },
  { name: "Mobile onboarding", status: "Review", updated: "Yesterday", progress: 90 },
  { name: "Billing migration", status: "Planned", updated: "3 days ago", progress: 10 },
];

const tone: Record<string, string> = { "In progress": "bg-blue-50 text-blue-700", Review: "bg-amber-50 text-amber-700", Planned: "bg-slate-100 text-slate-600" };

export function Dashboard() {
  const { user } = useAuth();
  return (
    <section className="py-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Welcome, {user?.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Plan: <span className="font-medium capitalize">{user?.plan}</span>
          </p>
        </div>
        <Link to="/app/settings" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50">
          Settings
        </Link>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[["Projects", String(projects.length)], ["In review", "1"], ["Seats used", "1 of 1"]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm text-slate-500">{l}</div>
            <div className="mt-1 text-2xl font-semibold">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Project</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Progress</th>
              <th className="px-5 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.name} className="border-t border-slate-100">
                <td className="px-5 py-3.5 font-medium">{p.name}</td>
                <td className="px-5 py-3.5">
                  <span className={"rounded-md px-2 py-0.5 text-xs font-medium " + tone[p.status]}>{p.status}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="block h-1.5 w-32 rounded-full bg-slate-100">
                    <span className="block h-1.5 rounded-full bg-blue-500" style={{ width: p.progress + "%" }} />
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-500">{p.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
`,
  "src/pages/Settings.tsx": `import { useState } from "react";
import { useAuth } from "../auth";

export function Settings() {
  const { user, signOut } = useAuth();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  return (
    <section className="max-w-xl py-4">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Your profile and session.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
        className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <label className="block text-sm">
          <span className="font-medium">Display name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
        </label>
        <p className="text-sm text-slate-600">Email: {user?.email}</p>
        <div className="flex gap-2 border-t border-slate-100 pt-5">
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Save
          </button>
          <button type="button" onClick={signOut} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
            Sign out
          </button>
        </div>
        {saved ? <p className="text-sm text-green-700">Saved locally (mock). Persist this to your API.</p> : null}
      </form>
    </section>
  );
}
`,
};

export const saasTemplate: Template = {
  id: "vite-react-saas",
  name: "SaaS starter",
  description: "Marketing pages, sign-in and sign-up screens, and an authenticated app area with a mocked session you replace with real auth.",
  longDescription:
    "A multi-page single-page app built on a tiny hash router (no extra dependency): landing, pricing, sign in, sign up, an app dashboard and a settings page. Authentication is deliberately mocked in src/auth.tsx and labelled as such in the UI; the session lives in localStorage so you can click through every flow before wiring up a real provider.",
  category: "saas",
  tags: ["react", "saas", "auth", "multi-page", "tailwind", "typescript"],
  framework: "vite-react",
  dependencies: VITE_DEPS,
  settings: VITE_SETTINGS,
  prebuilt: true,
  featured: true,
  difficulty: "intermediate",
  previewPath: "/",
  files,
};
