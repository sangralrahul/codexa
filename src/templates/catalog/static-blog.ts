import type { Template } from "../types";
import { STATIC_SETTINGS } from "../shared";

function page(title: string, body: string, depth = 0) {
  const root = depth === 0 ? "" : "../";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} — Field Notes</title>
    <meta name="description" content="A simple multi-page blog built with plain HTML and CSS." />
    <link rel="stylesheet" href="${root}styles.css" />
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="${root}index.html"><span class="mark" aria-hidden="true">F</span>Field Notes</a>
      <nav aria-label="Primary">
        <a href="${root}index.html">Posts</a>
        <a href="${root}about.html">About</a>
      </nav>
    </header>
    <main>
${body}
    </main>
    <footer class="site-footer">
      <p>Built with plain HTML and CSS. Edit the files in the Codexa editor and deploy to static hosting.</p>
    </footer>
    <script src="${root}app.js"></script>
  </body>
</html>
`;
}

const files: Record<string, string> = {
  "index.html": page(
    "Posts",
    `      <section class="intro">
        <p class="eyebrow">A blog about building small, fast websites</p>
        <h1>Field Notes</h1>
        <p class="lead">A multi-page blog with no build step. Add a file under <code>posts/</code> and link it here.</p>
      </section>
      <div class="layout">
        <div>
          <a class="featured" href="posts/getting-started.html">
            <span class="cover" aria-hidden="true"><span class="cover-title">Static<br />blogs</span></span>
            <span class="featured-body">
              <span class="kicker">Featured · 4 min read</span>
              <strong>Getting started with a static blog</strong>
              <span class="excerpt">Why a handful of HTML files is still a great way to publish, and how to add your first post.</span>
              <time datetime="2026-04-18">18 April 2026</time>
            </span>
          </a>
          <ul class="post-list">
            <li>
              <time datetime="2026-04-25">25 April 2026</time>
              <a href="posts/writing-tips.html">Writing tips for technical posts</a>
              <p>Short paragraphs, real examples, and a clear takeaway.</p>
              <span class="tags"><span>Writing</span><span>2 min read</span></span>
            </li>
            <li>
              <time datetime="2026-04-18">18 April 2026</time>
              <a href="posts/getting-started.html">Getting started with a static blog</a>
              <p>Why a handful of HTML files is still a great way to publish.</p>
              <span class="tags"><span>Basics</span><span>4 min read</span></span>
            </li>
          </ul>
        </div>
        <aside class="sidebar" aria-label="About this blog">
          <div class="box">
            <span class="avatar" aria-hidden="true"></span>
            <p><strong>Written by you.</strong> Replace this with two sentences about who writes here and why.</p>
            <a href="about.html">More about me →</a>
          </div>
          <div class="box">
            <p class="box-title">Topics</p>
            <p class="topics"><span>HTML</span><span>CSS</span><span>Writing</span><span>Performance</span><span>Hosting</span></p>
          </div>
        </aside>
      </div>`,
  ),
  "about.html": page(
    "About",
    `      <section class="intro">
        <h1>About</h1>
        <p class="lead">Tell readers who you are and what this blog is about. Replace this paragraph with your own introduction.</p>
        <p>Contact: <a href="mailto:you@example.com">you@example.com</a></p>
      </section>`,
  ),
  "posts/getting-started.html": page(
    "Getting started with a static blog",
    `      <article>
        <p class="meta"><time datetime="2026-04-18">18 April 2026</time> · 4 min read</p>
        <h1>Getting started with a static blog</h1>
        <p class="lead">A static blog is a folder of HTML files. There is nothing to install, nothing to build, and every page loads instantly.</p>
        <h2>Adding a post</h2>
        <ol>
          <li>Duplicate this file inside <code>posts/</code>.</li>
          <li>Change the title, date and content.</li>
          <li>Add a link to it from <code>index.html</code>.</li>
        </ol>
        <pre><code>posts/
  getting-started.html
  writing-tips.html
  your-new-post.html</code></pre>
        <p><a href="../index.html">← All posts</a></p>
      </article>`,
    1,
  ),
  "posts/writing-tips.html": page(
    "Writing tips for technical posts",
    `      <article>
        <p class="meta"><time datetime="2026-04-25">25 April 2026</time> · 2 min read</p>
        <h1>Writing tips for technical posts</h1>
        <p class="lead">Lead with the problem, show the smallest working example, and end with what the reader should do next.</p>
        <blockquote>If a sentence does not help the reader act, cut it.</blockquote>
        <p><a href="../index.html">← All posts</a></p>
      </article>`,
    1,
  ),
  "styles.css": `:root { --fg: #1c1917; --muted: #6b645c; --accent: #c2410c; --line: #e7e2da; --bg: #fbf8f3; --card: #ffffff; --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif; --sans: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; }
@media (prefers-color-scheme: dark) { :root { --fg: #f2ede6; --muted: #a39b91; --accent: #fb923c; --line: #2f2a25; --bg: #151311; --card: #1c1916; } }
* { box-sizing: border-box; }
body { margin: 0; font: 17px/1.7 var(--serif); color: var(--fg); background: var(--bg); -webkit-font-smoothing: antialiased; }
.site-header, main, .site-footer { max-width: 1040px; margin: 0 auto; padding: 0 24px; }
.site-header { display: flex; align-items: center; justify-content: space-between; padding-top: 22px; padding-bottom: 22px; font-family: var(--sans); border-bottom: 1px solid var(--line); }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 700; color: var(--fg); text-decoration: none; letter-spacing: -0.01em; }
.mark { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; background: var(--fg); color: var(--bg); font: 700 15px/1 var(--serif); }
nav a { margin-left: 6px; padding: 6px 12px; border-radius: 999px; color: var(--muted); text-decoration: none; font-size: 0.92rem; }
nav a:hover, nav a[aria-current="page"] { color: var(--fg); background: rgb(127 127 127 / 0.1); }
.intro { padding: 56px 0 36px; }
.eyebrow { margin: 0 0 10px; font: 600 0.8rem/1 var(--sans); letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
h1 { font-size: clamp(2.4rem, 5vw, 3.6rem); line-height: 1.05; letter-spacing: -0.02em; margin: 0 0 14px; font-weight: 600; }
h2 { font-size: 1.4rem; margin-top: 36px; }
.lead, .meta { color: var(--muted); }
.lead { font-size: 1.2rem; max-width: 40rem; }
.meta { font-family: var(--sans); font-size: 0.85rem; margin-top: 40px; }
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 48px; align-items: start; padding-bottom: 32px; }
.featured { display: grid; grid-template-columns: 240px 1fr; gap: 24px; padding: 14px; border: 1px solid var(--line); border-radius: 18px; background: var(--card); color: var(--fg); text-decoration: none; box-shadow: 0 20px 40px -32px rgb(28 25 23 / 0.5); }
.cover { position: relative; display: block; min-height: 190px; border-radius: 12px; overflow: hidden; background: radial-gradient(120% 90% at 0% 0%, #fdba74, #ea580c 55%, #7c2d12); }
.cover::after { content: ""; position: absolute; inset: 0; background-image: repeating-linear-gradient(0deg, rgb(255 255 255 / 0.08) 0 1px, transparent 1px 22px); }
.cover-title { position: absolute; left: 18px; bottom: 16px; color: #fff; font: 600 1.7rem/1 var(--serif); letter-spacing: -0.02em; }
.featured-body { display: grid; align-content: center; gap: 8px; }
.kicker { font: 600 0.75rem/1 var(--sans); letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }
.featured strong { font-size: 1.6rem; line-height: 1.2; letter-spacing: -0.01em; }
.excerpt { color: var(--muted); }
.featured time { font: 0.85rem var(--sans); color: var(--muted); }
.post-list { list-style: none; padding: 0; margin: 28px 0 0; }
.post-list li { padding: 22px 0; border-top: 1px solid var(--line); }
.post-list time { display: block; font-family: var(--sans); font-size: 0.82rem; color: var(--muted); }
.post-list a { font-size: 1.3rem; font-weight: 600; color: var(--fg); text-decoration: none; }
.post-list a:hover { color: var(--accent); }
.post-list p { margin: 4px 0 0; color: var(--muted); }
.tags, .topics { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; font-family: var(--sans); }
.tags span, .topics span { padding: 2px 10px; border-radius: 999px; border: 1px solid var(--line); font-size: 0.78rem; color: var(--muted); }
.sidebar { display: grid; gap: 16px; position: sticky; top: 24px; }
.box { padding: 20px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); font-size: 0.95rem; }
.box p { margin: 10px 0; }
.box a { font-family: var(--sans); font-size: 0.9rem; font-weight: 600; text-decoration: none; }
.box-title { margin: 0 !important; font: 600 0.75rem/1 var(--sans); letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.avatar { display: block; width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #fed7aa, #c2410c); }
article { max-width: 680px; margin: 0 auto; padding-bottom: 32px; }
a { color: var(--accent); }
pre { background: rgb(127 127 127 / 0.1); padding: 16px; border-radius: 10px; overflow-x: auto; font-size: 0.9rem; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em; }
blockquote { margin: 28px 0; padding: 4px 0 4px 20px; border-left: 3px solid var(--accent); color: var(--muted); font-size: 1.2rem; font-style: italic; }
.site-footer { padding: 32px 24px 48px; font-family: var(--sans); font-size: 0.85rem; color: var(--muted); border-top: 1px solid var(--line); margin-top: 40px; }
@media (max-width: 820px) { .layout, .featured { grid-template-columns: 1fr; } .sidebar { position: static; } }
`,
  "app.js": `// Highlight the current page in the navigation.
document.querySelectorAll("nav a").forEach((a) => {
  const target = a.getAttribute("href").split("/").pop();
  const current = location.pathname.split("/").pop() || "index.html";
  if (target === current || (current === "" && target === "index.html")) a.setAttribute("aria-current", "page");
});
`,
  "README.md": "# Field Notes\n\nA multi-page static blog: a post index with a featured post and sidebar, two example posts under `posts/` and an about page, all sharing `styles.css` (automatic dark mode via `prefers-color-scheme`). No build step: open `index.html` or deploy to Codexa static hosting.\n\nTo add a post, copy a file in `posts/`, change the title, date and text, and link it from `index.html`.\n",
};

export const staticBlogTemplate: Template = {
  id: "static-blog",
  name: "Multi-page blog",
  description: "A plain HTML and CSS blog with a post index, two example posts, and an about page. No build step.",
  longDescription:
    "Four HTML pages sharing one stylesheet: a post index, two posts under posts/, and an about page. Typography-first styling with automatic dark mode via prefers-color-scheme, semantic article markup with dates, and a tiny script that marks the current page in the navigation. Adding a post is copying a file.",
  category: "websites",
  tags: ["html", "css", "blog", "multi-page", "static"],
  framework: "static",
  dependencies: {},
  settings: STATIC_SETTINGS,
  prebuilt: true,
  difficulty: "beginner",
  previewPath: "/",
  files,
};
