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
      <a class="brand" href="${root}index.html">Field Notes</a>
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
    `      <h1>Posts</h1>
      <p class="lead">A multi-page blog with no build step. Add a file under <code>posts/</code> and link it here.</p>
      <ul class="post-list">
        <li>
          <time datetime="2026-04-18">18 April 2026</time>
          <a href="posts/getting-started.html">Getting started with a static blog</a>
          <p>Why a handful of HTML files is still a great way to publish.</p>
        </li>
        <li>
          <time datetime="2026-04-25">25 April 2026</time>
          <a href="posts/writing-tips.html">Writing tips for technical posts</a>
          <p>Short paragraphs, real examples, and a clear takeaway.</p>
        </li>
      </ul>`,
  ),
  "about.html": page(
    "About",
    `      <h1>About</h1>
      <p>Tell readers who you are and what this blog is about. Replace this paragraph with your own introduction.</p>
      <p>Contact: <a href="mailto:you@example.com">you@example.com</a></p>`,
  ),
  "posts/getting-started.html": page(
    "Getting started with a static blog",
    `      <article>
        <p class="meta"><time datetime="2026-04-18">18 April 2026</time></p>
        <h1>Getting started with a static blog</h1>
        <p>A static blog is a folder of HTML files. There is nothing to install, nothing to build, and every page loads instantly.</p>
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
        <p class="meta"><time datetime="2026-04-25">25 April 2026</time></p>
        <h1>Writing tips for technical posts</h1>
        <p>Lead with the problem, show the smallest working example, and end with what the reader should do next.</p>
        <blockquote>If a sentence does not help the reader act, cut it.</blockquote>
        <p><a href="../index.html">← All posts</a></p>
      </article>`,
    1,
  ),
  "styles.css": `:root { --fg: #1f2328; --muted: #656d76; --accent: #0969da; --line: #d0d7de; --bg: #ffffff; }
@media (prefers-color-scheme: dark) { :root { --fg: #e6edf3; --muted: #8b949e; --accent: #58a6ff; --line: #30363d; --bg: #0d1117; } }
* { box-sizing: border-box; }
body { margin: 0; font: 17px/1.65 Georgia, "Times New Roman", serif; color: var(--fg); background: var(--bg); }
.site-header, main, .site-footer { max-width: 680px; margin: 0 auto; padding: 0 20px; }
.site-header { display: flex; align-items: center; justify-content: space-between; padding-top: 24px; padding-bottom: 24px; font-family: system-ui, sans-serif; }
.brand { font-weight: 700; color: var(--fg); text-decoration: none; }
nav a { margin-left: 16px; color: var(--muted); text-decoration: none; }
nav a:hover { color: var(--accent); }
h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 12px; }
h2 { font-size: 1.3rem; margin-top: 32px; }
.lead, .meta { color: var(--muted); }
.post-list { list-style: none; padding: 0; margin: 32px 0; }
.post-list li { padding: 20px 0; border-top: 1px solid var(--line); }
.post-list time { display: block; font-family: system-ui, sans-serif; font-size: 0.85rem; color: var(--muted); }
.post-list a { font-size: 1.25rem; font-weight: 700; color: var(--fg); text-decoration: none; }
.post-list a:hover { color: var(--accent); }
.post-list p { margin: 6px 0 0; color: var(--muted); }
a { color: var(--accent); }
pre { background: rgba(127,127,127,0.12); padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.9rem; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.92em; }
blockquote { margin: 24px 0; padding-left: 16px; border-left: 3px solid var(--accent); color: var(--muted); }
.site-footer { padding: 40px 20px; font-family: system-ui, sans-serif; font-size: 0.85rem; color: var(--muted); border-top: 1px solid var(--line); margin-top: 48px; }
`,
  "app.js": `// Highlight the current page in the navigation.
document.querySelectorAll("nav a").forEach((a) => {
  const target = a.getAttribute("href").split("/").pop();
  const current = location.pathname.split("/").pop() || "index.html";
  if (target === current || (current === "" && target === "index.html")) a.setAttribute("aria-current", "page");
});
`,
  "README.md": "# Field Notes\n\nA multi-page static blog. No build step: open `index.html` or deploy to Codexa static hosting.\n",
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
