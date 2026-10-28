import { useState, type ReactNode } from "react";
import { Icon } from "../../shared/Icon";
import type { Link, Section, Visual } from "./types";

type Of<K extends Section["kind"]> = Extract<Section, { kind: K }>;

function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

function Eyebrow({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mb-3 text-sm font-semibold tracking-wide text-accent">{children}</p>;
}

function Heading({ eyebrow, title, text, center }: { eyebrow?: string; title: string; text?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h2>
      {text ? <p className="mt-4 text-lg leading-relaxed text-muted">{text}</p> : null}
    </div>
  );
}

export function Button({ link, variant = "primary" }: { link: Link; variant?: "primary" | "secondary" }) {
  const base = "inline-flex h-11 items-center justify-center gap-2 rounded-card px-5 text-[15px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  return (
    <a href={link.href} className={variant === "primary" ? `${base} bg-accent text-accent-fg hover:opacity-90` : `${base} border border-line bg-bg text-fg hover:bg-surface`}>
      {link.label}
    </a>
  );
}

/** Soft light falloff so flat colour blocks read as surfaces, not swatches. */
const SHADE = "radial-gradient(120% 90% at 20% 10%, rgba(255,255,255,0.18), transparent 55%), linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.16))";

function VisualBlock({ visual }: { visual: Visual }) {
  if (visual.type === "none") return null;
  if (visual.type === "tiles") {
    const [a, b, c, d] = visual.tones;
    return (
      <figure className="grid aspect-[5/4] grid-cols-6 grid-rows-6 gap-3">
        <div className="col-span-4 row-span-4 rounded-card" style={{ background: `${SHADE}, ${a}` }} />
        <div className="col-span-2 row-span-3 rounded-card" style={{ background: `${SHADE}, ${b ?? a}` }} />
        <div className="col-span-2 row-span-3 rounded-card" style={{ background: `${SHADE}, ${c ?? b ?? a}` }} />
        <div className="col-span-4 row-span-2 flex items-end rounded-card p-4" style={{ background: `${SHADE}, ${d ?? c ?? a}` }}>
          {visual.caption ? <figcaption className="text-sm font-medium text-white/90">{visual.caption}</figcaption> : null}
        </div>
      </figure>
    );
  }
  if (visual.type === "card") {
    return (
      <figure className="flex aspect-[5/4] flex-col justify-end rounded-card p-7 text-white" style={{ background: `${SHADE}, ${visual.tone}` }}>
        <p className="font-heading text-2xl font-semibold">{visual.title}</p>
        <ul className="mt-4 space-y-2 text-[15px] text-white/85">
          {visual.lines.map((l) => (
            <li key={l} className="flex items-center gap-2">
              <Icon name="check" className="h-4 w-4" /> {l}
            </li>
          ))}
        </ul>
      </figure>
    );
  }
  return (
    <figure className="overflow-hidden rounded-card border border-line bg-bg shadow-[0_24px_60px_-28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-3 text-sm font-medium">{visual.title}</span>
      </div>
      <ul className="divide-y divide-line">
        {visual.rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 px-5 py-3.5 text-[15px]">
            <span className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full" style={{ background: r.tone ?? "var(--color-accent)" }} />
              {r.label}
            </span>
            <span className="font-medium tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
      {visual.footer ? <figcaption className="border-t border-line bg-surface px-5 py-3 text-sm text-muted">{visual.footer}</figcaption> : null}
    </figure>
  );
}

function Hero({ s }: { s: Of<"hero"> }) {
  const actions = (
    <div className="mt-8 flex flex-wrap gap-3">
      <Button link={s.primary} />
      {s.secondary ? <Button link={s.secondary} variant="secondary" /> : null}
    </div>
  );
  if (s.variant === "center") {
    return (
      <section className="pb-16 pt-16 sm:pt-24">
        <Container className="text-center">
          <Eyebrow>{s.eyebrow}</Eyebrow>
          <h1 className="mx-auto max-w-3xl font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">{s.title}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">{s.text}</p>
          <div className="flex justify-center">{actions}</div>
          {s.note ? <p className="mt-4 text-sm text-muted">{s.note}</p> : null}
          {s.visual.type !== "none" ? (
            <div className="mx-auto mt-14 max-w-4xl text-left">
              <VisualBlock visual={s.visual} />
            </div>
          ) : null}
        </Container>
      </section>
    );
  }
  if (s.variant === "editorial") {
    return (
      <section className="pb-12 pt-14 sm:pt-20">
        <Container>
          <Eyebrow>{s.eyebrow}</Eyebrow>
          <h1 className="max-w-5xl font-heading text-5xl font-medium leading-[0.98] tracking-tight sm:text-7xl">{s.title}</h1>
          <div className="mt-10 grid gap-10 border-t border-line pt-8 md:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="text-lg leading-relaxed text-muted">{s.text}</p>
              {actions}
            </div>
            <VisualBlock visual={s.visual} />
          </div>
        </Container>
      </section>
    );
  }
  return (
    <section className="pb-16 pt-12 sm:pt-20">
      <Container className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <Eyebrow>{s.eyebrow}</Eyebrow>
          <h1 className="font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-[3.4rem]">{s.title}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{s.text}</p>
          {actions}
          {s.note ? <p className="mt-4 text-sm text-muted">{s.note}</p> : null}
        </div>
        <VisualBlock visual={s.visual} />
      </Container>
    </section>
  );
}

function Band({ id, children, tinted }: { id?: string; children: ReactNode; tinted?: boolean }) {
  return (
    <section id={id} className={`scroll-mt-20 py-20 sm:py-24 ${tinted ? "bg-surface" : ""}`}>
      <Container>{children}</Container>
    </section>
  );
}

function Features({ s }: { s: Of<"features"> }) {
  const cols = s.columns === 2 ? "sm:grid-cols-2" : s.columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <Band id={s.id}>
      <Heading eyebrow={s.eyebrow} title={s.title} text={s.text} />
      <ul className={`mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line ${cols}`}>
        {s.items.map((f) => (
          <li key={f.title} className="bg-bg p-7">
            <span className="grid h-10 w-10 place-items-center rounded-card bg-surface text-accent">
              <Icon name={f.icon} />
            </span>
            <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{f.text}</p>
          </li>
        ))}
      </ul>
    </Band>
  );
}

function Split({ s }: { s: Of<"split"> }) {
  return (
    <Band id={s.id} tinted>
      <div className={`grid items-center gap-12 lg:grid-cols-2 ${s.reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div>
          <Heading eyebrow={s.eyebrow} title={s.title} text={s.text} />
          <ul className="mt-8 space-y-3">
            {s.bullets.map((b) => (
              <li key={b} className="flex gap-3 text-[16px]">
                <span className="mt-0.5 text-accent">
                  <Icon name="check" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <VisualBlock visual={s.visual} />
      </div>
    </Band>
  );
}

function Menu({ s }: { s: Of<"menu"> }) {
  return (
    <Band id={s.id} tinted>
      <Heading eyebrow={s.eyebrow} title={s.title} text={s.text} center />
      <div className="mt-12 grid gap-10 md:grid-cols-2">
        {s.groups.map((g) => (
          <div key={g.name}>
            <h3 className="border-b border-line pb-3 font-heading text-xl font-semibold">{g.name}</h3>
            <ul className="mt-4 space-y-5">
              {g.items.map((i) => (
                <li key={i.name}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-medium">{i.name}</span>
                    <span className="flex-1 border-b border-dotted border-line" />
                    <span className="font-medium tabular-nums">{i.price}</span>
                  </div>
                  {i.text ? <p className="mt-1 text-[15px] text-muted">{i.text}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Band>
  );
}

function Pricing({ s }: { s: Of<"pricing"> }) {
  return (
    <Band id={s.id}>
      <Heading eyebrow={s.eyebrow} title={s.title} text={s.text} center />
      <div className={`mt-12 grid gap-5 ${s.plans.length === 2 ? "mx-auto max-w-3xl md:grid-cols-2" : "md:grid-cols-3"}`}>
        {s.plans.map((p) => (
          <div key={p.name} className={`flex flex-col rounded-card border p-7 ${p.featured ? "border-accent shadow-[0_20px_50px_-30px_rgba(0,0,0,0.4)]" : "border-line"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              {p.featured ? <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-fg">Most popular</span> : null}
            </div>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="font-heading text-4xl font-semibold tracking-tight">{p.price}</span>
              {p.period ? <span className="text-muted">{p.period}</span> : null}
            </p>
            <p className="mt-3 text-muted">{p.text}</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-[15px]">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <span className="text-accent">
                    <Icon name="check" className="h-5 w-5" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 [&>a]:w-full">
              <Button link={p.cta} variant={p.featured ? "primary" : "secondary"} />
            </div>
          </div>
        ))}
      </div>
    </Band>
  );
}

function Gallery({ s }: { s: Of<"gallery"> }) {
  return (
    <Band id={s.id}>
      <Heading eyebrow={s.eyebrow} title={s.title} text={s.text} />
      <ul className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
        {s.items.map((g, i) => (
          <li key={g.title} className={i % 5 === 0 ? "md:row-span-2" : ""}>
            <figure className="flex h-full min-h-48 flex-col justify-end rounded-card p-5 text-white" style={{ background: `${SHADE}, ${g.tone}` }}>
              <figcaption>
                <p className="font-medium">{g.title}</p>
                {g.caption ? <p className="text-sm text-white/80">{g.caption}</p> : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Band>
  );
}

function Projects({ s }: { s: Of<"projects"> }) {
  return (
    <Band id={s.id}>
      <Heading eyebrow={s.eyebrow} title={s.title} />
      <ul className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2">
        {s.items.map((p) => (
          <li key={p.title}>
            <a href="#contact" className="group block">
              <div className="aspect-[4/3] rounded-card transition group-hover:opacity-90" style={{ background: `${SHADE}, ${p.tone}` }} />
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <h3 className="text-lg font-semibold group-hover:underline">{p.title}</h3>
                <span className="text-sm tabular-nums text-muted">{p.year}</span>
              </div>
              <p className="text-muted">{p.tag}</p>
            </a>
          </li>
        ))}
      </ul>
    </Band>
  );
}

function Quotes({ s }: { s: Of<"quotes"> }) {
  return (
    <Band id={s.id} tinted>
      <Heading eyebrow={s.eyebrow} title={s.title} />
      <ul className="mt-12 grid gap-5 md:grid-cols-3">
        {s.items.map((q) => (
          <li key={q.name} className="flex flex-col rounded-card border border-line bg-bg p-7">
            <p className="flex-1 text-[16px] leading-relaxed">&ldquo;{q.quote}&rdquo;</p>
            <p className="mt-6 font-medium">{q.name}</p>
            <p className="text-sm text-muted">{q.role}</p>
          </li>
        ))}
      </ul>
    </Band>
  );
}

function Stats({ s }: { s: Of<"stats"> }) {
  return (
    <section id={s.id} className="border-y border-line py-12">
      <Container>
        <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {s.items.map((x) => (
            <div key={x.label}>
              <dd className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{x.value}</dd>
              <dt className="mt-1 text-muted">{x.label}</dt>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

function Steps({ s }: { s: Of<"steps"> }) {
  return (
    <Band id={s.id}>
      <Heading eyebrow={s.eyebrow} title={s.title} />
      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {s.items.map((x, i) => (
          <li key={x.title} className="border-t-2 border-fg pt-5">
            <span className="text-sm font-semibold tabular-nums text-accent">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-2 text-lg font-semibold">{x.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{x.text}</p>
          </li>
        ))}
      </ol>
    </Band>
  );
}

function Team({ s }: { s: Of<"team"> }) {
  return (
    <Band id={s.id}>
      <Heading eyebrow={s.eyebrow} title={s.title} />
      <ul className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
        {s.items.map((p) => (
          <li key={p.name}>
            <div className="grid aspect-square place-items-center rounded-card font-heading text-4xl font-semibold text-white/90" style={{ background: `${SHADE}, ${p.tone}` }}>
              {p.name
                .split(" ")
                .map((w) => w[0])
                .join("")}
            </div>
            <p className="mt-3 font-medium">{p.name}</p>
            <p className="text-sm text-muted">{p.role}</p>
          </li>
        ))}
      </ul>
    </Band>
  );
}

function Timeline({ s }: { s: Of<"timeline"> }) {
  return (
    <Band id={s.id} tinted>
      <Heading eyebrow={s.eyebrow} title={s.title} />
      <ol className="mt-10 divide-y divide-line border-y border-line">
        {s.items.map((t) => (
          <li key={t.title + t.period} className="grid gap-2 py-6 sm:grid-cols-[180px_1fr]">
            <span className="text-sm tabular-nums text-muted">{t.period}</span>
            <div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="mt-1 text-muted">{t.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Band>
  );
}

function Faq({ s }: { s: Of<"faq"> }) {
  return (
    <Band id={s.id}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <Heading eyebrow={s.eyebrow} title={s.title} />
        <div className="divide-y divide-line border-y border-line">
          {s.items.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <span className="text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </Band>
  );
}

function Products({ s }: { s: Of<"products"> }) {
  const categories = ["All", ...Array.from(new Set(s.items.map((p) => p.category)))];
  const [filter, setFilter] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const money = (n: number) => `${s.currency}${n.toFixed(2).replace(/\.00$/, "")}`;
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = s.items.reduce((sum, p) => sum + (cart[p.name] ?? 0) * p.price, 0);
  const shown = filter === "All" ? s.items : s.items.filter((p) => p.category === filter);
  return (
    <Band id={s.id}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Heading eyebrow={s.eyebrow} title={s.title} text={s.text} />
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-card border border-line px-4 font-medium hover:bg-surface">
          <Icon name="box" /> Cart <span className="rounded-full bg-accent px-2 text-sm text-accent-fg tabular-nums">{count}</span>
        </button>
      </div>
      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter products">
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setFilter(c)} aria-pressed={filter === c} className={`h-9 rounded-full px-4 text-sm font-medium ${filter === c ? "bg-fg text-bg" : "border border-line hover:bg-surface"}`}>
            {c}
          </button>
        ))}
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
        {shown.map((p) => (
          <li key={p.name} className="flex flex-col">
            <div className="relative aspect-[4/5] rounded-card" style={{ background: `${SHADE}, ${p.tone}` }}>
              {p.badge ? <span className="absolute left-3 top-3 rounded-full bg-bg px-2.5 py-1 text-xs font-medium">{p.badge}</span> : null}
            </div>
            <h3 className="mt-4 font-medium">{p.name}</h3>
            <p className="mt-1 flex-1 text-sm text-muted">{p.text}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-semibold tabular-nums">{money(p.price)}</span>
              <button type="button" onClick={() => setCart((c) => ({ ...c, [p.name]: (c[p.name] ?? 0) + 1 }))} className="h-9 rounded-card bg-accent px-3.5 text-sm font-medium text-accent-fg hover:opacity-90">
                Add to cart
              </button>
            </div>
          </li>
        ))}
      </ul>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOpen(false)}>
          <aside className="flex h-full w-full max-w-sm flex-col bg-bg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} aria-label="Cart">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl font-semibold">Your cart</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-fg" aria-label="Close cart">
                ✕
              </button>
            </div>
            <ul className="mt-6 flex-1 divide-y divide-line overflow-auto">
              {s.items
                .filter((p) => cart[p.name])
                .map((p) => (
                  <li key={p.name} className="flex items-center justify-between gap-3 py-4">
                    <span>
                      {p.name}
                      <span className="block text-sm text-muted">
                        {cart[p.name]} × {money(p.price)}
                      </span>
                    </span>
                    <button type="button" className="text-sm text-muted underline" onClick={() => setCart(({ [p.name]: _, ...rest }) => rest)}>
                      Remove
                    </button>
                  </li>
                ))}
              {count === 0 ? <li className="py-8 text-center text-muted">Your cart is empty.</li> : null}
            </ul>
            <div className="border-t border-line pt-5">
              <p className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span className="tabular-nums">{money(total)}</span>
              </p>
              <button type="button" disabled={count === 0} className="mt-4 h-11 w-full rounded-card bg-accent font-medium text-accent-fg disabled:opacity-50">
                Checkout
              </button>
              <p className="mt-2 text-center text-xs text-muted">Demo store: connect Stripe or Razorpay to take payments.</p>
            </div>
          </aside>
        </div>
      ) : null}
    </Band>
  );
}

function Hours({ s }: { s: Of<"hours"> }) {
  return (
    <Band id={s.id}>
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <Heading eyebrow={s.eyebrow} title={s.title} text={s.text} />
          <ul className="mt-8 space-y-3 text-[16px]">
            <li className="flex gap-3">
              <span className="text-accent">
                <Icon name="pin" />
              </span>
              {s.address}
            </li>
            {s.phone ? (
              <li className="flex gap-3">
                <span className="text-accent">
                  <Icon name="phone" />
                </span>
                {s.phone}
              </li>
            ) : null}
            {s.email ? (
              <li className="flex gap-3">
                <span className="text-accent">
                  <Icon name="mail" />
                </span>
                {s.email}
              </li>
            ) : null}
          </ul>
        </div>
        <dl className="divide-y divide-line rounded-card border border-line">
          {s.rows.map((r) => (
            <div key={r.day} className="flex justify-between gap-4 px-6 py-4">
              <dt className="font-medium">{r.day}</dt>
              <dd className="tabular-nums text-muted">{r.time}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Band>
  );
}

function Cta({ s }: { s: Of<"cta"> }) {
  return (
    <section id={s.id} className="py-16">
      <Container>
        <div className="rounded-card bg-fg px-8 py-14 text-center text-bg sm:px-16">
          <h2 className="mx-auto max-w-2xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{s.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg opacity-75">{s.text}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={s.primary.href} className="inline-flex h-11 items-center rounded-card bg-accent px-5 font-medium text-accent-fg hover:opacity-90">
              {s.primary.label}
            </a>
            {s.secondary ? (
              <a href={s.secondary.href} className="inline-flex h-11 items-center rounded-card border border-current/30 px-5 font-medium opacity-90 hover:opacity-100">
                {s.secondary.label}
              </a>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}

const FIELD: Record<Of<"contact">["fields"][number], { label: string; type: string; autoComplete?: string }> = {
  name: { label: "Name", type: "text", autoComplete: "name" },
  email: { label: "Email", type: "email", autoComplete: "email" },
  phone: { label: "Phone", type: "tel", autoComplete: "tel" },
  date: { label: "Date", type: "date" },
  guests: { label: "Guests", type: "number" },
  company: { label: "Company", type: "text", autoComplete: "organization" },
  message: { label: "Message", type: "textarea" },
};

function Contact({ s }: { s: Of<"contact"> }) {
  const [sent, setSent] = useState(false);
  return (
    <Band id={s.id ?? "contact"} tinted>
      <div className="grid gap-12 lg:grid-cols-2">
        <Heading eyebrow={s.eyebrow} title={s.title} text={s.text} />
        {sent ? (
          <div className="rounded-card border border-line bg-bg p-8">
            <p className="font-heading text-xl font-semibold">Thank you</p>
            <p className="mt-2 text-muted">We have your message and will reply soon. (Demo form: connect an email service to receive these.)</p>
          </div>
        ) : (
          <form
            className="grid gap-4 rounded-card border border-line bg-bg p-7 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            {s.fields.map((f) => {
              const d = FIELD[f];
              const id = `field-${f}`;
              return (
                <label key={f} htmlFor={id} className={`text-sm font-medium ${f === "message" ? "sm:col-span-2" : ""}`}>
                  {d.label}
                  {d.type === "textarea" ? (
                    <textarea id={id} rows={4} required className="mt-1.5 block w-full rounded-card border border-line bg-bg px-3 py-2.5 text-[15px] outline-none focus:border-accent" />
                  ) : (
                    <input id={id} type={d.type} autoComplete={d.autoComplete} required={f === "name" || f === "email"} className="mt-1.5 block h-11 w-full rounded-card border border-line bg-bg px-3 text-[15px] outline-none focus:border-accent" />
                  )}
                </label>
              );
            })}
            <button type="submit" className="h-11 rounded-card bg-accent font-medium text-accent-fg hover:opacity-90 sm:col-span-2">
              {s.button}
            </button>
          </form>
        )}
      </div>
    </Band>
  );
}

export function SectionView({ s }: { s: Section }) {
  switch (s.kind) {
    case "hero":
      return <Hero s={s} />;
    case "features":
      return <Features s={s} />;
    case "split":
      return <Split s={s} />;
    case "menu":
      return <Menu s={s} />;
    case "pricing":
      return <Pricing s={s} />;
    case "gallery":
      return <Gallery s={s} />;
    case "projects":
      return <Projects s={s} />;
    case "quotes":
      return <Quotes s={s} />;
    case "stats":
      return <Stats s={s} />;
    case "steps":
      return <Steps s={s} />;
    case "team":
      return <Team s={s} />;
    case "timeline":
      return <Timeline s={s} />;
    case "faq":
      return <Faq s={s} />;
    case "products":
      return <Products s={s} />;
    case "hours":
      return <Hours s={s} />;
    case "cta":
      return <Cta s={s} />;
    case "contact":
      return <Contact s={s} />;
  }
}
