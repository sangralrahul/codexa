import type { Template } from "../types";
import { STATIC_SETTINGS } from "../shared";

const files: Record<string, string> = {
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Launchpad — Ship your product faster</title>
    <meta name="description" content="A conversion-focused landing page with no build step." />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="nav">
      <a class="brand" href="#top">Launchpad</a>
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
        <h1>Ship your product faster</h1>
        <p>Replace this with a one-sentence value proposition. Keep it specific and measurable.</p>
        <div class="actions">
          <a class="button" href="#signup">Start free</a>
          <a class="button secondary" href="#features">See how it works</a>
        </div>
      </section>

      <section id="features" class="features" aria-labelledby="features-title">
        <h2 id="features-title">Everything you need</h2>
        <div class="grid">
          <article><h3>Fast setup</h3><p>Describe the first benefit in one or two sentences.</p></article>
          <article><h3>Secure by default</h3><p>Describe the second benefit in one or two sentences.</p></article>
          <article><h3>Scales with you</h3><p>Describe the third benefit in one or two sentences.</p></article>
        </div>
      </section>

      <section id="pricing" class="pricing" aria-labelledby="pricing-title">
        <h2 id="pricing-title">Pricing</h2>
        <div class="grid">
          <article><h3>Free</h3><p class="price">$0</p><ul><li>1 project</li><li>Community support</li></ul><a class="button secondary" href="#signup">Choose Free</a></article>
          <article class="highlight"><h3>Pro</h3><p class="price">$12<span>/mo</span></p><ul><li>Unlimited projects</li><li>Email support</li></ul><a class="button" href="#signup">Choose Pro</a></article>
          <article><h3>Team</h3><p class="price">$39<span>/mo</span></p><ul><li>Everything in Pro</li><li>5 seats</li></ul><a class="button secondary" href="#signup">Choose Team</a></article>
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
      <p>© <span id="year"></span> Launchpad. Replace with your company name.</p>
    </footer>
    <script src="app.js"></script>
  </body>
</html>
`,
  "styles.css": `:root { --fg: #0f172a; --muted: #475569; --accent: #2563eb; --line: #e2e8f0; --bg: #ffffff; --surface: #f8fafc; }
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--fg); background: var(--bg); line-height: 1.6; }
h1, h2, h3 { line-height: 1.2; letter-spacing: -0.01em; }
.nav { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
.brand { font-weight: 700; text-decoration: none; color: var(--fg); }
.nav-links { display: flex; gap: 20px; align-items: center; }
.nav-links a { color: var(--muted); text-decoration: none; }
.nav-toggle { display: none; border: 1px solid var(--line); background: #fff; padding: 6px 10px; border-radius: 8px; }
@media (max-width: 640px) {
  .nav-toggle { display: inline-block; }
  .nav-links { display: none; position: absolute; left: 0; right: 0; top: 100%; flex-direction: column; align-items: stretch; padding: 12px 20px; background: #fff; border-bottom: 1px solid var(--line); }
  .nav-links.open { display: flex; }
}
.button { display: inline-block; padding: 10px 18px; border-radius: 10px; background: var(--accent); color: #fff !important; text-decoration: none; font-weight: 600; border: 0; cursor: pointer; font-size: 1rem; }
.button.secondary { background: transparent; color: var(--fg) !important; border: 1px solid var(--line); }
.hero { text-align: center; padding: 96px 20px 72px; max-width: 760px; margin: 0 auto; }
.hero h1 { font-size: clamp(2.2rem, 6vw, 3.5rem); margin: 0 0 16px; }
.hero p { font-size: 1.2rem; color: var(--muted); margin: 0 0 28px; }
.actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
section { padding: 64px 20px; }
section h2 { text-align: center; font-size: 2rem; margin: 0 0 32px; }
.grid { display: grid; gap: 20px; max-width: 1000px; margin: 0 auto; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.grid article { border: 1px solid var(--line); border-radius: 14px; padding: 24px; background: #fff; }
.grid article h3 { margin-top: 0; }
.pricing { background: var(--surface); }
.pricing .highlight { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
.price { font-size: 2rem; font-weight: 700; margin: 8px 0; }
.price span { font-size: 1rem; font-weight: 400; color: var(--muted); }
.pricing ul { padding-left: 18px; color: var(--muted); }
.faq { max-width: 680px; margin: 0 auto; }
details { border: 1px solid var(--line); border-radius: 10px; padding: 12px 16px; margin-bottom: 10px; }
summary { cursor: pointer; font-weight: 600; }
.signup { max-width: 560px; margin: 0 auto; text-align: center; }
.signup label { display: block; text-align: left; font-weight: 600; margin-bottom: 6px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
.row input { flex: 1 1 220px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; font-size: 1rem; }
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
  "README.md": "# Launchpad landing page\n\nStatic HTML/CSS/JS. No build step. Edit `index.html`, `styles.css` and `app.js`.\n",
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
