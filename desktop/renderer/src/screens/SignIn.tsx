import { useEffect, useState } from "react";
import { ArrowRight, Globe, MessageSquare, MonitorPlay, Rocket, ShieldCheck } from "lucide-react";
import { cn } from "../lib/util";
import { Button, Field, Input, Logo } from "../ui";
import { ProjectThumb } from "../components/ProjectThumb";

const SHOWCASE = [
  { id: "vite-react-saas", name: "SaaS starter", prompt: "A SaaS app for booking studio time, with plans and billing" },
  { id: "vite-react-dashboard", name: "Analytics dashboard", prompt: "A sales dashboard with revenue charts and a customers table" },
  { id: "vite-react-storefront", name: "Online store", prompt: "An online store for handmade candles with a cart" },
  { id: "vite-react-landing", name: "Landing page", prompt: "A landing page for a coffee subscription with pricing and FAQ" },
];
const WORDS = ["a landing page", "a dashboard", "an online store", "a SaaS app", "a portfolio"];
const STEPS = [
  ["Describe it", "Codexa plans it and writes the code.", MessageSquare],
  ["See it run", "A live preview while you chat.", MonitorPlay],
  ["Publish", "Checked for security and speed first.", Rocket],
] as const;

/**
 * Native sign-in. Email and password go straight to the Codexa API; Google/GitHub sign-in and
 * creating an account open a small window on the Codexa site that signs this app in.
 */
export function SignIn({ onSignedIn }: { onSignedIn: (u: SessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"form" | "browser" | null>(null);
  const [info, setInfo] = useState<{ version: string; appUrl: string } | null>(null);
  const [slide, setSlide] = useState(0);
  const [word, setWord] = useState(0);

  useEffect(() => {
    window.codexa
      .info()
      .then((i) => setInfo({ version: i.version, appUrl: i.appUrl }))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const a = setInterval(() => setSlide((s) => (s + 1) % SHOWCASE.length), 4200);
    const b = setInterval(() => setWord((w) => (w + 1) % WORDS.length), 2600);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy("form");
    setError(null);
    const res = await window.codexa.login(email.trim(), password);
    if (res.ok && res.data?.user) {
      onSignedIn((await window.codexa.me()) ?? res.data.user);
      return;
    }
    setBusy(null);
    setError(res.data?.error?.message ?? (res.status === 0 ? "Can't reach Codexa. Check your internet connection." : "Those details didn't work. Try again."));
  };

  const browser = async (page: "login" | "signup") => {
    setBusy("browser");
    setError(null);
    const user = await window.codexa.browserAuth(page);
    setBusy(null);
    if (user) onSignedIn(user);
  };

  const current = SHOWCASE[slide];

  return (
    <div className="relative flex h-full overflow-hidden">
      <div className="drag fixed inset-x-0 top-0 z-10 h-11" />
      {/* Ambient background: slow drifting colour, a dot grid, and a soft vignette. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="orb orb-a left-[-120px] top-[-160px] size-[520px]" />
        <span className="orb orb-b right-[-140px] top-[10%] size-[560px]" />
        <span className="orb orb-c bottom-[-200px] left-[30%] size-[520px]" />
        <span className="dot-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(75%_70%_at_50%_45%,black,transparent)]" />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-8">
        <div className="w-full max-w-[380px]">
          <div className="rise flex items-center gap-2.5 text-fg" style={{ "--d": "0ms" } as React.CSSProperties}>
            <span className="brand-gradient flex size-9 items-center justify-center rounded-xl text-white shadow-card">
              <Logo size={20} />
            </span>
            <span className="text-[19px] font-semibold tracking-[-0.02em]">codexa</span>
          </div>
          <h1 className="rise mt-10 font-[family-name:var(--font-display)] text-[34px] font-bold leading-tight tracking-[-0.035em]" style={{ "--d": "80ms" } as React.CSSProperties}>
            Welcome back
          </h1>
          <p className="rise mt-2 text-[14.5px] text-muted" style={{ "--d": "140ms" } as React.CSSProperties}>
            Sign in and build{" "}
            <span key={word} className="word-in font-medium text-fg">
              {WORDS[word]}
            </span>{" "}
            in minutes.
          </p>

          <div className="rise mt-8" style={{ "--d": "200ms" } as React.CSSProperties}>
            <Button size="lg" className="press w-full" onClick={() => void browser("login")} loading={busy === "browser"} disabled={busy === "form"}>
              <Globe /> Continue with Google or GitHub
            </Button>
          </div>

          <div className="rise my-6 flex items-center gap-3 text-[12px] text-dim" style={{ "--d": "260ms" } as React.CSSProperties}>
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="rise space-y-4" style={{ "--d": "320ms" } as React.CSSProperties} noValidate>
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="focus-halo" />
            </Field>
            <Field label="Password" htmlFor="password" error={error}>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="focus-halo" />
            </Field>
            <Button type="submit" variant="primary" size="lg" className="press group w-full" loading={busy === "form"} disabled={busy === "browser"}>
              Sign in <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>

          <div className="rise mt-6 flex items-center justify-between text-[13px]" style={{ "--d": "400ms" } as React.CSSProperties}>
            <button type="button" className="text-muted transition-colors hover:text-fg" onClick={() => void window.codexa.openWeb("/forgot-password")}>
              Forgot password?
            </button>
            <button type="button" className="font-medium text-fg hover:underline" onClick={() => void browser("signup")}>
              Create an account
            </button>
          </div>
        </div>
        <p className="rise absolute inset-x-0 bottom-5 flex items-center justify-center gap-3 text-[11.5px] text-dim" style={{ "--d": "520ms" } as React.CSSProperties}>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Your session stays on this PC
          </span>
          <span aria-hidden="true">·</span>
          <span>Codexa for Windows{info ? ` ${info.version}` : ""}</span>
          <span aria-hidden="true">·</span>
          <button type="button" className="hover:text-fg" onClick={() => void window.codexa.openWeb("/terms")}>
            Terms
          </button>
          <button type="button" className="hover:text-fg" onClick={() => void window.codexa.openWeb("/privacy")}>
            Privacy
          </button>
        </p>
      </div>

      <aside className="brand-mesh relative hidden w-[52%] max-w-[800px] flex-col justify-center overflow-hidden border-l border-border/70 px-14 lg:flex">
        <div className="relative">
          <p className="rise inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2.5 py-1 text-[12px] font-medium text-muted shadow-sm" style={{ "--d": "120ms" } as React.CSSProperties}>
            <Logo size={12} /> Codexa for Windows
          </p>
          <h2 className="rise mt-4 max-w-xl text-balance font-[family-name:var(--font-display)] text-[40px] font-bold leading-[1.05] tracking-[-0.04em]" style={{ "--d": "200ms" } as React.CSSProperties}>
            From a sentence to a <span className="brand-gradient-text">running app.</span>
          </h2>
          <p className="rise mt-3 max-w-lg text-[15px] leading-relaxed text-muted" style={{ "--d": "240ms" } as React.CSSProperties}>
            Describe it. Codexa plans the files, writes real code, runs a live preview and publishes it, all from this app.
          </p>

          {/* Showcase: a template screenshot inside a window frame, cycling with a crossfade. */}
          <figure className="rise lift glow-frame mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-card" style={{ "--d": "300ms" } as React.CSSProperties}>
            <div className="flex h-9 items-center gap-1.5 border-b border-border bg-surface/60 px-3">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 flex h-5 min-w-0 flex-1 items-center rounded-md bg-card px-2 font-mono text-[11px] text-dim">
                <span className="size-1.5 rounded-full bg-success" />
                <span className="ml-1.5 truncate">{current.id.replace("vite-react-", "")}-sites.codexa.app</span>
              </span>
            </div>
            <div className="relative aspect-[16/10] w-full bg-white">
              {SHOWCASE.map((s, i) => (
                <ProjectThumb key={s.id} templateId={s.id} name={s.name} big className={cn("absolute inset-0 h-full w-full transition-opacity duration-700", i === slide ? "opacity-100" : "opacity-0")} />
              ))}
            </div>
            <figcaption className="flex items-center gap-3 border-t border-border px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span key={current.id} className="word-in block truncate text-[12.5px] text-fg">
                  “{current.prompt}”
                </span>
                <span className="block text-[11.5px] text-muted">{current.name} · one of 111 starters</span>
              </span>
              <span className="flex gap-1" role="tablist" aria-label="Showcase">
                {SHOWCASE.map((s, i) => (
                  <button key={s.id} type="button" role="tab" aria-selected={i === slide} aria-label={s.name} onClick={() => setSlide(i)} className={cn("h-1.5 rounded-full transition-all duration-300", i === slide ? "w-5 bg-fg" : "w-1.5 bg-border-strong hover:bg-dim")} />
                ))}
              </span>
            </figcaption>
          </figure>

          <ul className="mt-6 grid grid-cols-3 gap-3">
            {STEPS.map(([t, d, Icon], i) => (
              <li key={t} className="rise lift rounded-xl border border-border bg-card/90 p-3.5 card-edge" style={{ "--d": `${380 + i * 70}ms` } as React.CSSProperties}>
                <span className="icon-tile size-8">
                  <Icon className="size-4" />
                </span>
                <p className="mt-2.5 text-[13.5px] font-semibold">{t}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
