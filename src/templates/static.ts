import type { Template } from "./types";
import { STATIC_SETTINGS } from "./shared";

const settings = STATIC_SETTINGS;

export const staticTemplates: Template[] = [
  {
    id: "static-site",
    name: "Static website",
    description: "Plain HTML, CSS, and JavaScript with no build step. Ideal for simple sites and learning.",
    longDescription:
      "Three files — index.html, styles.css and app.js — served as-is by the Codexa static runtime. There is no bundler, no framework and no install step, which makes it the fastest way to learn how the editor, preview and deployment fit together.",
    category: "websites",
    tags: ["html", "css", "javascript", "static"],
    framework: "static",
    dependencies: {},
    settings,
    prebuilt: true,
    featured: true,
    difficulty: "beginner",
    previewPath: "/",
    files: {
      "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sunrise Studio — Calm, fast websites</title>
    <meta name="description" content="A small design studio. Replace this with a sentence about you." />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="#top"><span class="logo" aria-hidden="true"></span>Sunrise Studio</a>
      <nav aria-label="Primary">
        <a href="#services">Services</a>
        <a href="#work">Work</a>
        <a href="#about">About</a>
        <a href="#contact" class="nav-cta">Contact</a>
      </nav>
    </header>

    <main id="top">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow"><span class="dot"></span> Booking projects for June</p>
          <h1>Calm, fast websites for small businesses.</h1>
          <p class="lead">We design and build sites that load instantly and are easy to update. This page is plain HTML, CSS and JavaScript: edit <code>index.html</code>, <code>styles.css</code> and <code>app.js</code>.</p>
          <div class="actions">
            <button id="cta" type="button">Say hello</button>
            <a class="button secondary" href="#work">See our work</a>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="window">
            <div class="window-bar"><span></span><span></span><span></span></div>
            <div class="window-body">
              <div class="art-hero"></div>
              <div class="art-row"><i></i><i></i><i></i></div>
              <div class="art-lines"><b></b><b></b><b class="short"></b></div>
            </div>
          </div>
          <div class="chip chip-a">No build step</div>
          <div class="chip chip-b">3 files · HTML, CSS, JS</div>
        </div>
      </section>

      <section id="services" class="section">
        <h2>What we do</h2>
        <div class="cards">
          <article class="card"><span class="icon">✦</span><h3>Design</h3><p>Clear layouts, readable type and a palette that fits your brand.</p></article>
          <article class="card"><span class="icon">⚡</span><h3>Build</h3><p>Hand-written HTML and CSS that loads in a blink on any phone.</p></article>
          <article class="card"><span class="icon">↻</span><h3>Care</h3><p>Small monthly updates so your site never goes stale.</p></article>
        </div>
      </section>

      <section id="work" class="section">
        <h2>Recent work</h2>
        <div class="work">
          <a class="project" href="#contact"><span class="thumb t1"></span><strong>Juniper Bakery</strong><small>Menu, ordering hours and a map</small></a>
          <a class="project" href="#contact"><span class="thumb t2"></span><strong>Harbor Yoga</strong><small>Class schedule and booking links</small></a>
          <a class="project" href="#contact"><span class="thumb t3"></span><strong>Kestrel Bikes</strong><small>Repairs price list and gallery</small></a>
        </div>
      </section>

      <section id="about" class="section split">
        <h2>About</h2>
        <p>Tell visitors who you are, what you care about and why they should work with you. Two short paragraphs is plenty: people skim.</p>
      </section>

      <section id="contact" class="section contact">
        <h2>Contact</h2>
        <p>Have a project in mind? Write to <a href="mailto:hello@example.com">hello@example.com</a>.</p>
      </section>
    </main>

    <footer class="site-footer">
      <span>© Sunrise Studio</span>
      <span>Built with plain HTML, CSS and JavaScript.</span>
    </footer>
    <script src="app.js"></script>
  </body>
</html>
`,
      "styles.css": `:root {
  --ink: #14161a;
  --muted: #5d6470;
  --line: #e7e5df;
  --paper: #fbfaf7;
  --card: #ffffff;
  --accent: #e2512c;
  --accent-soft: #fde6dc;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--ink); background: var(--paper); line-height: 1.6; -webkit-font-smoothing: antialiased; }
a { color: inherit; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; background: #f0eee8; padding: 0.1em 0.35em; border-radius: 5px; }

.site-header { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; max-width: 1120px; margin: 0 auto; padding: 18px 24px; background: rgb(251 250 247 / 0.85); backdrop-filter: blur(10px); }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; text-decoration: none; letter-spacing: -0.01em; }
.logo { width: 26px; height: 26px; border-radius: 8px; background: conic-gradient(from 200deg, #f59e0b, var(--accent), #fb7185, #f59e0b); box-shadow: inset 0 0 0 4px rgb(255 255 255 / 0.35); }
.site-header nav { display: flex; align-items: center; gap: 6px; }
.site-header nav a { padding: 8px 12px; border-radius: 999px; color: var(--muted); text-decoration: none; font-size: 0.95rem; }
.site-header nav a:hover { color: var(--ink); background: #f0eee8; }
.site-header nav .nav-cta { color: #fff; background: var(--ink); }
.site-header nav .nav-cta:hover { color: #fff; background: #2b2f36; }

main { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
.hero { display: grid; grid-template-columns: 1.05fr 1fr; gap: 56px; align-items: center; padding: 72px 0 88px; }
.eyebrow { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 20px; padding: 6px 12px; border-radius: 999px; background: var(--card); border: 1px solid var(--line); font-size: 0.85rem; color: var(--muted); }
.dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px #dcfce7; }
h1 { font-size: clamp(2.5rem, 5vw, 4rem); line-height: 1.04; letter-spacing: -0.035em; margin: 0; }
.lead { font-size: 1.15rem; color: var(--muted); max-width: 34rem; margin: 20px 0 0; }
.actions { display: flex; gap: 12px; margin-top: 32px; }
button, .button { display: inline-flex; align-items: center; background: var(--accent); color: #fff; border: 0; padding: 12px 20px; border-radius: 12px; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; box-shadow: 0 10px 24px -10px var(--accent); }
button:hover, .button:hover { filter: brightness(1.05); }
.button.secondary { background: var(--card); color: var(--ink); border: 1px solid var(--line); box-shadow: none; }

.hero-art { position: relative; }
.window { border-radius: 18px; background: var(--card); border: 1px solid var(--line); box-shadow: 0 40px 80px -40px rgb(20 22 26 / 0.35); overflow: hidden; transform: rotate(-1.5deg); }
.window-bar { display: flex; gap: 6px; padding: 12px 14px; border-bottom: 1px solid var(--line); }
.window-bar span { width: 9px; height: 9px; border-radius: 50%; background: #e7e5df; }
.window-body { padding: 18px; }
.art-hero { height: 150px; border-radius: 12px; background: radial-gradient(120% 120% at 0% 0%, #fdba74 0%, var(--accent) 45%, #9f1239 100%); }
.art-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
.art-row i { height: 64px; border-radius: 10px; background: #f3f1ec; }
.art-row i:nth-child(2) { background: var(--accent-soft); }
.art-lines { margin-top: 14px; display: grid; gap: 8px; }
.art-lines b { height: 8px; border-radius: 4px; background: #eceae4; }
.art-lines .short { width: 55%; }
.chip { position: absolute; padding: 8px 12px; border-radius: 999px; background: var(--card); border: 1px solid var(--line); font-size: 0.8rem; font-weight: 600; box-shadow: 0 12px 24px -12px rgb(20 22 26 / 0.3); }
.chip-a { left: -18px; bottom: 36px; }
.chip-b { right: -10px; top: -14px; }

.section { padding: 64px 0; border-top: 1px solid var(--line); }
.section h2 { font-size: 1.75rem; letter-spacing: -0.02em; margin: 0 0 24px; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 24px; }
.card h3 { margin: 14px 0 6px; font-size: 1.1rem; }
.card p { margin: 0; color: var(--muted); }
.icon { display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--accent-soft); color: var(--accent); font-weight: 700; }
.work { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.project { display: grid; gap: 4px; text-decoration: none; }
.project small { color: var(--muted); font-size: 0.9rem; }
.thumb { display: block; aspect-ratio: 4 / 3; border-radius: 14px; margin-bottom: 10px; border: 1px solid var(--line); }
.t1 { background: linear-gradient(135deg, #fde68a, #f59e0b); }
.t2 { background: linear-gradient(135deg, #bae6fd, #6366f1); }
.t3 { background: linear-gradient(135deg, #bbf7d0, #0f766e); }
.split { display: grid; grid-template-columns: 240px 1fr; gap: 24px; }
.split p { margin: 0; color: var(--muted); font-size: 1.1rem; max-width: 40rem; }
.contact p { font-size: 1.1rem; color: var(--muted); }
.site-footer { display: flex; justify-content: space-between; gap: 16px; max-width: 1120px; margin: 0 auto; padding: 32px 24px 48px; color: var(--muted); font-size: 0.9rem; border-top: 1px solid var(--line); }

@media (max-width: 820px) {
  .hero, .cards, .work, .split { grid-template-columns: 1fr; }
  .hero { padding-top: 40px; }
  .site-header nav a:not(.nav-cta) { display: none; }
  .chip { display: none; }
}
`,
      "app.js": `document.getElementById("cta").addEventListener("click", () => {
  alert("Hello from your static site!");
});
`,
      "README.md": "# Static site\n\nA one-page site in plain HTML, CSS and JavaScript: `index.html`, `styles.css` and `app.js`. No build step; open `index.html` in a browser or deploy it to Codexa static hosting.\n\nReplace the sample studio name, projects and copy with your own.\n",
    },
  },
  {
    id: "static-portfolio",
    name: "Personal portfolio",
    description: "A single-page portfolio with projects grid and contact section. No build step.",
    longDescription:
      "A dark single-page portfolio: name, one-line introduction, a responsive projects grid with CSS-drawn covers, a short experience list and a contact card. Pure HTML and CSS, so it deploys to Codexa static hosting without a build.",
    category: "portfolios",
    tags: ["html", "css", "portfolio"],
    framework: "static",
    dependencies: {},
    settings,
    prebuilt: true,
    difficulty: "beginner",
    previewPath: "/",
    files: {
      "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Maya Chen — Product designer</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="glow" aria-hidden="true"></div>
    <main>
      <header class="intro">
        <p class="status"><span></span> Available for freelance from June</p>
        <h1>Maya Chen</h1>
        <p class="lead">Product designer and front-end developer. I turn messy workflows into calm, fast interfaces. Replace this with your own one-line introduction.</p>
        <nav class="links" aria-label="Elsewhere">
          <a href="mailto:you@example.com">Email</a>
          <a href="https://github.com/">GitHub</a>
          <a href="https://www.linkedin.com/">LinkedIn</a>
        </nav>
      </header>

      <section aria-labelledby="projects">
        <h2 id="projects">Selected projects</h2>
        <div class="grid">
          <article>
            <div class="cover c1" aria-hidden="true"><span></span><span></span><span></span></div>
            <h3>Ledger — expense approvals</h3>
            <p>Cut approval time from days to minutes for a 40-person finance team.</p>
            <ul class="tags"><li>Product design</li><li>React</li></ul>
          </article>
          <article>
            <div class="cover c2" aria-hidden="true"><span></span><span></span><span></span></div>
            <h3>Tidepool — clinic booking</h3>
            <p>Mobile-first booking flow with reminders and a staff calendar.</p>
            <ul class="tags"><li>UX research</li><li>Design system</li></ul>
          </article>
          <article>
            <div class="cover c3" aria-hidden="true"><span></span><span></span><span></span></div>
            <h3>Northstar — analytics</h3>
            <p>Dashboards that answer one question each, without a manual.</p>
            <ul class="tags"><li>Data viz</li><li>TypeScript</li></ul>
          </article>
        </div>
      </section>

      <section aria-labelledby="experience">
        <h2 id="experience">Experience</h2>
        <ol class="timeline">
          <li><span>2024 — now</span><strong>Independent</strong><em>Design and front-end for early-stage teams</em></li>
          <li><span>2021 — 2024</span><strong>Senior product designer, Ledger</strong><em>Led the approvals and reporting products</em></li>
          <li><span>2018 — 2021</span><strong>Designer, Studio North</strong><em>Websites and apps for small businesses</em></li>
        </ol>
      </section>

      <section class="contact" aria-labelledby="contact">
        <h2 id="contact">Let&rsquo;s work together</h2>
        <p>Tell me about your project and timeline. I reply within two working days.</p>
        <a class="button" href="mailto:you@example.com">you@example.com</a>
      </section>
    </main>
  </body>
</html>
`,
      "styles.css": `:root { --bg: #0b0c0f; --card: #121419; --line: #23262d; --fg: #f2f3f5; --muted: #9aa3b2; --accent: #a78bfa; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--fg); -webkit-font-smoothing: antialiased; }
.glow { position: fixed; inset: -20% -10% auto; height: 70vh; background: radial-gradient(50% 50% at 30% 30%, rgb(139 92 246 / 0.28), transparent 70%), radial-gradient(40% 40% at 75% 20%, rgb(56 189 248 / 0.18), transparent 70%); pointer-events: none; }
main { position: relative; max-width: 1040px; margin: 0 auto; padding: 72px 24px 96px; }
.status { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 24px; padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: rgb(18 20 25 / 0.7); color: var(--muted); font-size: 0.85rem; }
.status span { width: 7px; height: 7px; border-radius: 50%; background: #34d399; box-shadow: 0 0 0 3px rgb(52 211 153 / 0.2); }
h1 { font-size: clamp(3rem, 7vw, 5.25rem); line-height: 1; margin: 0; letter-spacing: -0.045em; background: linear-gradient(180deg, #fff 30%, #a3a9b6); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lead { color: var(--muted); font-size: 1.25rem; line-height: 1.6; max-width: 40rem; margin: 20px 0 0; }
.links { display: flex; gap: 8px; margin-top: 28px; }
.links a { padding: 8px 14px; border: 1px solid var(--line); border-radius: 999px; color: var(--fg); text-decoration: none; font-size: 0.9rem; background: var(--card); }
.links a:hover { border-color: #3a3f49; }
h2 { margin: 72px 0 20px; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
article { border: 1px solid var(--line); border-radius: 18px; padding: 12px 12px 20px; background: var(--card); transition: border-color 0.2s, transform 0.2s; }
article:hover { border-color: #3a3f49; transform: translateY(-2px); }
.cover { position: relative; height: 150px; border-radius: 12px; overflow: hidden; margin-bottom: 16px; }
.cover span { position: absolute; border-radius: 8px; background: rgb(255 255 255 / 0.85); box-shadow: 0 10px 30px -10px rgb(0 0 0 / 0.5); }
.cover span:nth-child(1) { left: 14%; top: 22%; width: 52%; height: 64%; }
.cover span:nth-child(2) { left: 58%; top: 34%; width: 30%; height: 42%; background: rgb(255 255 255 / 0.6); }
.cover span:nth-child(3) { left: 20%; top: 32%; width: 26%; height: 6%; background: rgb(15 23 42 / 0.25); box-shadow: none; }
.c1 { background: linear-gradient(135deg, #7c3aed, #db2777); }
.c2 { background: linear-gradient(135deg, #0ea5e9, #10b981); }
.c3 { background: linear-gradient(135deg, #f59e0b, #ef4444); }
article h3 { margin: 0 8px 6px; font-size: 1.05rem; }
article p { margin: 0 8px; color: var(--muted); font-size: 0.95rem; line-height: 1.55; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; padding: 0; margin: 14px 8px 0; }
.tags li { padding: 3px 9px; border-radius: 999px; background: #1b1e25; color: var(--muted); font-size: 0.78rem; }
.timeline { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--line); }
.timeline li { display: grid; grid-template-columns: 160px 1fr; gap: 4px 24px; padding: 18px 0; border-bottom: 1px solid var(--line); }
.timeline span { color: var(--muted); font-size: 0.9rem; grid-row: span 2; }
.timeline em { color: var(--muted); font-style: normal; font-size: 0.95rem; }
.contact { margin-top: 72px; padding: 40px; border: 1px solid var(--line); border-radius: 24px; background: linear-gradient(180deg, #15171d, var(--card)); }
.contact h2 { margin: 0; font-size: 1.75rem; letter-spacing: -0.02em; text-transform: none; color: var(--fg); }
.contact p { color: var(--muted); margin: 10px 0 24px; }
.button { display: inline-block; padding: 12px 20px; border-radius: 12px; background: var(--fg); color: var(--bg); font-weight: 600; text-decoration: none; }
a { color: var(--accent); }
@media (max-width: 640px) { .timeline li { grid-template-columns: 1fr; } .timeline span { grid-row: auto; } }
`,
      "README.md": "# Portfolio\n\nA dark one-page portfolio in plain HTML and CSS. No build step.\n\nReplace the sample name, projects, experience and email address in `index.html` with your own.\n",
    },
  },
];
