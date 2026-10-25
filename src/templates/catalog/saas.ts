import type { Template } from "../types";
import { HASH_ROUTER, USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-saas",
    title: "Acme SaaS",
    readme: `# SaaS starter

Multi-page single-page app with marketing pages, sign-in / sign-up screens and an authenticated app area.

**Authentication is mocked.** \`src/auth.tsx\` stores the "session" in localStorage so you can click through the flows.
Replace it with a real provider (your own API, Supabase Auth, Clerk, Auth0 ...) before shipping.

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

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="font-semibold tracking-tight">
            Acme
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/pricing" className="text-slate-600 hover:text-slate-900">
              Pricing
            </Link>
            {user ? (
              <>
                <Link to="/app" className="text-slate-600 hover:text-slate-900">
                  App
                </Link>
                <button type="button" onClick={signOut} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="text-slate-600 hover:text-slate-900">
                  Sign in
                </Link>
                <Link to="/signup" className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700">
                  Start free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-500 sm:px-6">
        Mock authentication — replace <code>src/auth.tsx</code> with a real provider before launch.
      </footer>
    </div>
  );
}
`,
  "src/pages/Landing.tsx": `import { Link } from "../router";

export function Landing() {
  return (
    <section className="py-12 text-center sm:py-20">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Your product, one sentence.</h1>
      <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">Describe the outcome you deliver. Ask Codexa to rewrite this hero for your audience.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link to="/signup" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700">
          Create account
        </Link>
        <Link to="/pricing" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium hover:bg-white">
          See pricing
        </Link>
      </div>
      <div className="mt-16 grid gap-6 text-left sm:grid-cols-3">
        {[
          ["Workspaces", "Invite teammates and manage roles."],
          ["Usage limits", "Metered plans enforced server-side."],
          ["Audit log", "Every change recorded."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-2 text-sm text-slate-600">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
`,
  "src/pages/Pricing.tsx": `import { Link } from "../router";

const tiers = [
  { name: "Free", price: "$0", features: ["1 workspace", "3 projects", "Community support"] },
  { name: "Pro", price: "$19/mo", features: ["Unlimited projects", "Priority support", "Usage analytics"] },
  { name: "Team", price: "$49/mo", features: ["Everything in Pro", "5 seats", "Roles and audit log"] },
];

export function Pricing() {
  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-2 text-slate-600">Placeholder tiers. Connect a payment provider to make these real.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-medium">{t.name}</h2>
            <p className="mt-2 text-3xl font-semibold">{t.price}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
              {t.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            <Link to="/signup" className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white">
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
    <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
      <strong>Mock authentication.</strong> Any email is accepted and nothing is verified. Replace <code>src/auth.tsx</code> with real auth before shipping.
    </p>
  );
}

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
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <MockNotice />
      <label className="block text-sm">
        <span className="font-medium">Email</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Password</span>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button type="submit" className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Sign in
      </button>
      <p className="text-center text-sm text-slate-600">
        No account? <Link to="/signup" className="text-blue-600">Sign up</Link>
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
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-semibold">Create your account</h1>
      <MockNotice />
      <label className="block text-sm">
        <span className="font-medium">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Email</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <button type="submit" className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
        Create account
      </button>
      <p className="text-center text-sm text-slate-600">
        Already registered? <Link to="/signin" className="text-blue-600">Sign in</Link>
      </p>
    </form>
  );
}
`,
  "src/pages/Dashboard.tsx": `import { useAuth } from "../auth";
import { Link } from "../router";

const projects = [
  { name: "Website redesign", status: "In progress", updated: "2 hours ago" },
  { name: "Mobile onboarding", status: "Review", updated: "Yesterday" },
  { name: "Billing migration", status: "Planned", updated: "3 days ago" },
];

export function Dashboard() {
  const { user } = useAuth();
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user?.name}</h1>
          <p className="text-sm text-slate-600">
            Plan: <span className="font-medium capitalize">{user?.plan}</span>
          </p>
        </div>
        <Link to="/app/settings" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
          Settings
        </Link>
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-3">Project</th>
              <th className="p-3">Status</th>
              <th className="p-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.name} className="border-t border-slate-100">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.status}</td>
                <td className="p-3 text-slate-500">{p.updated}</td>
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
    <section className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
        className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
        <label className="block text-sm">
          <span className="font-medium">Display name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <p className="text-sm text-slate-600">Email: {user?.email}</p>
        <div className="flex gap-2">
          <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Save
          </button>
          <button type="button" onClick={signOut} className="rounded-md border border-slate-300 px-4 py-2 text-sm">
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
