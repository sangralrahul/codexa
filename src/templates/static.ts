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
    <title>My site</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="site-header">
      <strong>My site</strong>
      <nav><a href="#about">About</a><a href="#contact">Contact</a></nav>
    </header>
    <main>
      <section class="hero">
        <h1>Welcome</h1>
        <p>This is a static website generated with Codexa. Edit <code>index.html</code>, <code>styles.css</code>, and <code>app.js</code>.</p>
        <button id="cta">Say hello</button>
      </section>
      <section id="about"><h2>About</h2><p>Tell visitors who you are.</p></section>
      <section id="contact"><h2>Contact</h2><p>hello@example.com</p></section>
    </main>
    <script src="app.js"></script>
  </body>
</html>
`,
      "styles.css": `* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #111; line-height: 1.6; }
.site-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #e5e7eb; }
.site-header nav a { margin-left: 16px; color: #374151; text-decoration: none; }
main { max-width: 760px; margin: 0 auto; padding: 24px; }
.hero { padding: 48px 0; }
h1 { font-size: 2.5rem; margin: 0 0 8px; }
button { background: #2563eb; color: #fff; border: 0; padding: 10px 16px; border-radius: 8px; font-size: 1rem; cursor: pointer; }
button:hover { background: #1d4ed8; }
section { padding: 24px 0; border-top: 1px solid #f3f4f6; }
`,
      "app.js": `document.getElementById("cta").addEventListener("click", () => {
  alert("Hello from your static site!");
});
`,
      "README.md": "# Static site\n\nOpen `index.html` in a browser or run any static file server.\n",
    },
  },
  {
    id: "static-portfolio",
    name: "Personal portfolio",
    description: "A single-page portfolio with projects grid and contact section. No build step.",
    longDescription:
      "A dark single-page portfolio: name, one-line introduction, a responsive projects grid and a contact link. Pure HTML and CSS, so it deploys to Codexa static hosting without a build.",
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
    <title>Your Name — Portfolio</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main>
      <h1>Your Name</h1>
      <p class="lead">Developer and designer. Replace this with a one-line introduction.</p>
      <h2>Projects</h2>
      <div class="grid">
        <article><h3>Project one</h3><p>What it does and what you built.</p></article>
        <article><h3>Project two</h3><p>What it does and what you built.</p></article>
        <article><h3>Project three</h3><p>What it does and what you built.</p></article>
      </div>
      <h2>Contact</h2>
      <p><a href="mailto:you@example.com">you@example.com</a></p>
    </main>
  </body>
</html>
`,
      "styles.css": `body { margin: 0; font-family: system-ui, sans-serif; background: #0b0c0f; color: #f2f3f5; }
main { max-width: 800px; margin: 0 auto; padding: 64px 24px; }
h1 { font-size: 2.75rem; margin: 0; letter-spacing: -0.02em; }
.lead { color: #9aa3b2; font-size: 1.125rem; }
h2 { margin-top: 48px; font-size: 1.25rem; }
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
article { border: 1px solid #23262d; border-radius: 12px; padding: 20px; background: #111318; }
article h3 { margin: 0 0 8px; }
a { color: #8b7bff; }
`,
      "README.md": "# Portfolio\n\nStatic site, no build step.\n",
    },
  },
];
