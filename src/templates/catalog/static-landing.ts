import type { Template } from "../types";
import { STATIC_SETTINGS } from "../shared";

const files: Record<string, string> = {
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Relay — Team updates without the meetings</title>
    <meta name="description" content="A conversion-focused landing page with no build step." />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="nav">
      <a class="brand" href="#top"><span class="mark" aria-hidden="true"></span>Relay</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-links">Menu</button>
      <nav id="nav-links" class="nav-links" aria-label="Primary">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#faq">FAQ</a>
        <a class="button" href="#signup">Get started</a>
      </nav>
    </header>

    <main id="top">
      <section class="hero">
        <div class="hero-inner">
          <p class="pill"><span>Beta</span> Weekly digests are now in early access</p>
          <h1>Team updates, <em>without the meetings.</em></h1>
          <p class="sub">Relay collects a two-minute async check-in from everyone and turns it into one digest your team actually reads. Replace this with your own one-sentence value proposition.</p>
          <div class="actions">
            <a class="button" href="#signup">Start free</a>
            <a class="button secondary" href="#features">See how it works</a>
          </div>
        </div>
        <div class="mock" aria-hidden="true">
          <div class="mock-card">
            <div class="mock-head"><b>Weekly digest</b><span>Product team · 6 updates</span></div>
            <div class="mock-row"><i class="av a1"></i><div><b>Asha</b><p>Shipped the new onboarding checklist; next is analytics.</p></div><span class="tag ok">Done</span></div>
            <div class="mock-row"><i class="av a2"></i><div><b>Diego</b><p>Billing migration at 80%. Blocked on the tax API keys.</p></div><span class="tag warn">Blocked</span></div>
            <div class="mock-row"><i class="av a3"></i><div><b>Lena</b><p>Interviewed 5 customers about reporting. Notes in the doc.</p></div><span class="tag">Update</span></div>
          </div>
          <div class="mock-float"><b>2 min</b><span>average check-in</span></div>
        </div>
      </section>

      <section id="features" class="features" aria-labelledby="features-title">
        <p class="kicker">Features</p>
        <h2 id="features-title">Everything you need, nothing you will not use</h2>
        <div class="grid">
          <article><span class="ic">◎</span><h3>Async check-ins</h3><p>Three short questions on the schedule you choose. Answer from the browser or email.</p></article>
          <article><span class="ic">✦</span><h3>One readable digest</h3><p>Updates are grouped by project with blockers on top, so leads see what needs them.</p></article>
          <article><span class="ic">⌁</span><h3>Quiet by default</h3><p>No pings unless something is blocked. Everyone else gets their focus back.</p></article>
        </div>
      </section>

      <section id="pricing" class="pricing" aria-labelledby="pricing-title">
        <p class="kicker">Pricing</p>
        <h2 id="pricing-title">Start free, upgrade when it sticks</h2>
        <div class="grid">
          <article><h3>Free</h3><p class="price">$0</p><ul><li>Up to 5 people</li><li>Weekly digest</li><li>Community support</li></ul><a class="button secondary" href="#signup">Choose Free</a></article>
          <article class="highlight"><span class="badge">Most popular</span><h3>Pro</h3><p class="price">$12<span>/mo</span></p><ul><li>Unlimited people</li><li>Daily or weekly digests</li><li>Email support</li></ul><a class="button" href="#signup">Choose Pro</a></article>
          <article><h3>Team</h3><p class="price">$39<span>/mo</span></p><ul><li>Everything in Pro</li><li>Multiple teams</li><li>Admin controls</li></ul><a class="button secondary" href="#signup">Choose Team</a></article>
        </div>
      </section>

      <section id="faq" class="faq" aria-labelledby="faq-title">
        <h2 id="faq-title">Questions</h2>
        <details><summary>Is there a free plan?</summary><p>Yes. Edit this answer to describe your free tier.</p></details>
        <details><summary>Can I cancel any time?</summary><p>Describe your cancellation policy here.</p></details>
        <details><summary>Do you offer support?</summary><p>Describe your support channels and hours here.</p></details>
      </section>

      <section id="signup" class="signup" aria-labelledby="signup-title">
        <h2 id="signup-title">Get early access</h2>
        <p class="sub">Join the beta and we will email you when your workspace is ready.</p>
        <form id="signup-form" novalidate>
          <label for="email">Email address</label>
          <div class="row">
            <input id="email" name="email" type="email" placeholder="you@example.com" required />
            <button class="button" type="submit">Notify me</button>
          </div>
          <p id="form-status" class="status" role="status"></p>
          <p class="hint">This form does not send data anywhere yet. Point it at your API in <code>app.js</code>.</p>
        </form>
      </section>
    </main>

    <footer class="footer">
      <p>© <span id="year"></span> Relay. Replace with your company name.</p>
    </footer>
    <script src="app.js"></script>
  </body>
</html>
`,
  "styles.css": `:root { --fg: #0f172a; --muted: #475569; --accent: #d97706; --accent-2: #06b6d4; --line: #e2e8f0; --bg: #ffffff; --surface: #f8fafc; --night: #0b1020; }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--fg); background: var(--bg); line-height: 1.6; -webkit-font-smoothing: antialiased; }
h1, h2, h3 { line-height: 1.15; letter-spacing: -0.02em; }
.nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 14px max(20px, calc((100% - 1120px) / 2)); background: rgb(11 16 32 / 0.85); backdrop-filter: blur(10px); border-bottom: 1px solid rgb(255 255 255 / 0.06); }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; text-decoration: none; color: #fff; }
.mark { width: 24px; height: 24px; border-radius: 7px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); box-shadow: 0 0 20px rgb(79 70 229 / 0.6); }
.nav-links { display: flex; gap: 24px; align-items: center; }
.nav-links a { color: #cbd5e1; text-decoration: none; font-size: 0.95rem; }
.nav-links a:hover { color: #fff; }
.nav-toggle { display: none; border: 1px solid rgb(255 255 255 / 0.15); background: transparent; color: #fff; padding: 6px 10px; border-radius: 8px; }
@media (max-width: 720px) {
  .nav-toggle { display: inline-block; }
  .nav-links { display: none; position: absolute; left: 0; right: 0; top: 100%; flex-direction: column; align-items: stretch; padding: 12px 20px; background: var(--night); border-bottom: 1px solid rgb(255 255 255 / 0.08); }
  .nav-links.open { display: flex; }
}
.button { display: inline-block; padding: 11px 18px; border-radius: 10px; background: var(--accent); color: #fff !important; text-decoration: none; font-weight: 600; border: 0; cursor: pointer; font-size: 0.98rem; box-shadow: 0 10px 24px -12px var(--accent); }
.button:hover { filter: brightness(1.08); }
.button.secondary { background: transparent; color: var(--fg) !important; border: 1px solid var(--line); box-shadow: none; }

.hero { position: relative; display: grid; grid-template-columns: 1.1fr 1fr; gap: 48px; align-items: center; padding: 88px max(20px, calc((100% - 1120px) / 2)) 96px; background: radial-gradient(60% 80% at 80% 0%, rgb(79 70 229 / 0.45), transparent 70%), radial-gradient(50% 60% at 10% 100%, rgb(6 182 212 / 0.25), transparent 70%), var(--night); color: #fff; overflow: hidden; }
.pill { display: inline-flex; align-items: center; gap: 10px; margin: 0 0 22px; padding: 5px 12px 5px 5px; border-radius: 999px; background: rgb(255 255 255 / 0.06); border: 1px solid rgb(255 255 255 / 0.1); font-size: 0.85rem; color: #cbd5e1; }
.pill span { padding: 2px 8px; border-radius: 999px; background: linear-gradient(90deg, var(--accent), var(--accent-2)); color: #fff; font-weight: 600; font-size: 0.75rem; }
.hero h1 { font-size: clamp(2.4rem, 5.4vw, 4rem); margin: 0; }
.hero h1 em { font-style: normal; background: linear-gradient(90deg, #a5b4fc, #67e8f9); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sub { font-size: 1.15rem; color: #94a3b8; max-width: 34rem; margin: 20px 0 30px; }
.hero .button.secondary { color: #fff !important; border-color: rgb(255 255 255 / 0.2); }
.actions { display: flex; gap: 12px; flex-wrap: wrap; }
.mock { position: relative; }
.mock-card { border-radius: 18px; padding: 18px; background: rgb(255 255 255 / 0.96); color: var(--fg); box-shadow: 0 40px 80px -30px rgb(0 0 0 / 0.6); }
.mock-head { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 6px 14px; border-bottom: 1px solid var(--line); }
.mock-head span { color: var(--muted); font-size: 0.8rem; }
.mock-row { display: grid; grid-template-columns: 32px 1fr auto; gap: 12px; align-items: start; padding: 14px 6px; border-bottom: 1px solid var(--line); font-size: 0.9rem; }
.mock-row:last-child { border-bottom: 0; }
.mock-row p { margin: 2px 0 0; color: var(--muted); font-size: 0.85rem; line-height: 1.45; }
.av { width: 32px; height: 32px; border-radius: 50%; }
.a1 { background: linear-gradient(135deg, #fda4af, #f43f5e); }
.a2 { background: linear-gradient(135deg, #fcd34d, #f97316); }
.a3 { background: linear-gradient(135deg, #a5b4fc, #d97706); }
.tag { padding: 2px 8px; border-radius: 999px; background: #fffbeb; color: #b45309; font-size: 0.75rem; font-weight: 600; }
.tag.ok { background: #dcfce7; color: #15803d; }
.tag.warn { background: #fef3c7; color: #b45309; }
.mock-float { position: absolute; left: -28px; bottom: -22px; display: grid; padding: 12px 16px; border-radius: 14px; background: #fff; color: var(--fg); box-shadow: 0 20px 40px -20px rgb(0 0 0 / 0.5); }
.mock-float b { font-size: 1.4rem; }
.mock-float span { color: var(--muted); font-size: 0.8rem; }

section { padding: 88px 20px; }
.kicker { text-align: center; margin: 0 0 8px; color: var(--accent); font-weight: 600; font-size: 0.9rem; }
section h2 { text-align: center; font-size: clamp(1.8rem, 3vw, 2.3rem); margin: 0 auto 40px; max-width: 34rem; }
.grid { display: grid; gap: 20px; max-width: 1080px; margin: 0 auto; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.grid article { position: relative; border: 1px solid var(--line); border-radius: 18px; padding: 28px; background: #fff; }
.grid article h3 { margin: 14px 0 8px; }
.grid article p { margin: 0; color: var(--muted); }
.ic { display: inline-grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: #fffbeb; color: var(--accent); font-size: 1.2rem; }
.pricing { background: var(--surface); }
.pricing .highlight { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 24px 48px -24px rgb(79 70 229 / 0.4); }
.badge { position: absolute; top: 20px; right: 20px; padding: 2px 10px; border-radius: 999px; background: #fffbeb; color: #b45309; font-size: 0.75rem; font-weight: 600; }
.price { font-size: 2.4rem; font-weight: 700; letter-spacing: -0.03em; margin: 8px 0; }
.price span { font-size: 1rem; font-weight: 400; color: var(--muted); }
.pricing ul { list-style: none; padding: 0; margin: 16px 0 24px; color: var(--muted); }
.pricing li { padding: 4px 0 4px 22px; position: relative; }
.pricing li::before { content: "✓"; position: absolute; left: 0; color: var(--accent); font-weight: 700; }
.faq { max-width: 720px; margin: 0 auto; }
details { border: 1px solid var(--line); border-radius: 12px; padding: 14px 18px; margin-bottom: 10px; background: #fff; }
summary { cursor: pointer; font-weight: 600; }
details p { margin: 10px 0 0; color: var(--muted); }
.signup { max-width: 600px; margin: 0 auto; text-align: center; }
.signup .sub { color: var(--muted); margin: -24px auto 28px; }
.signup label { display: block; text-align: left; font-weight: 600; margin-bottom: 6px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
.row input { flex: 1 1 220px; padding: 11px 14px; border: 1px solid var(--line); border-radius: 10px; font-size: 1rem; }
.status { min-height: 1.4em; margin: 10px 0 0; font-size: 0.95rem; }
.status.error { color: #b91c1c; }
.status.ok { color: #15803d; }
.hint { font-size: 0.85rem; color: var(--muted); }
.footer { border-top: 1px solid var(--line); padding: 24px 20px; text-align: center; color: var(--muted); font-size: 0.9rem; }
`,
  "app.js": `// Mobile navigation toggle
const toggle = document.querySelector(".nav-toggle");
const links = document.getElementById("nav-links");
toggle.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});
links.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

// Signup form: validate locally. Replace the TODO with a fetch() to your API.
const form = document.getElementById("signup-form");
const status = document.getElementById("form-status");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = form.elements.email.value.trim();
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    status.textContent = "Enter a valid email address.";
    status.className = "status error";
    return;
  }
  // TODO: await fetch("/api/subscribe", { method: "POST", body: JSON.stringify({ email }) });
  status.textContent = "Thanks! (Nothing was sent — connect this form to your API.)";
  status.className = "status ok";
  form.reset();
});

document.getElementById("year").textContent = String(new Date().getFullYear());
`,
  "README.md": "# Relay landing page\n\nA launch page in static HTML, CSS and JavaScript: sticky navigation with a mobile toggle, a dark hero with CSS product art, features, pricing, an FAQ and an email form that validates locally (it is not connected to a backend yet). No build step. Edit `index.html`, `styles.css` and `app.js`.\n",
};

export const staticLandingTemplate: Template = {
  id: "static-landing",
  name: "Landing page (static)",
  description: "A single-page HTML landing page with sticky nav, hero, features, pricing, FAQ, and an email capture form.",
  longDescription:
    "Everything a launch page needs in three files: a responsive sticky navigation with a mobile toggle, hero with two calls to action, feature and pricing grids, a native <details> FAQ, and an email form with client-side validation that clearly states it is not connected to a backend yet. Deploys to Codexa static hosting as-is.",
  category: "landing-pages",
  tags: ["html", "css", "landing", "marketing", "static"],
  framework: "static",
  dependencies: {},
  settings: STATIC_SETTINGS,
  prebuilt: true,
  difficulty: "beginner",
  previewPath: "/",
  files,
};
