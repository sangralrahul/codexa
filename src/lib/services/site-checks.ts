/**
 * Publish checks.
 * - scanProject(files): a static pass over the project source before publishing: exposed keys,
 *   unsafe code, SEO basics in index.html, images without alt text, dead in-page links, heavy files.
 * - siteReport(...): a speed and SEO report on what was actually published (the built files),
 *   with compressed sizes measured, not estimated.
 * Every finding points at real files and lines; nothing is scored without evidence.
 */

export type CheckCategory = "security" | "seo" | "performance" | "quality";
export type Severity = "error" | "warning" | "pass";
export type Finding = { id: string; category: CheckCategory; severity: Severity; title: string; detail: string; where?: { path: string; line?: number }[] };
export type ScanReport = { findings: Finding[]; counts: Record<Severity, number>; scannedFiles: number };

const SOURCE = /\.(tsx|jsx|ts|js|mjs|cjs|html|vue|svelte|astro|json|md|css)$/;
const SKIP = /(^|\/)(node_modules|dist|build|\.next|\.git)\/|package-lock\.json$/;
const MARKUP = /\.(tsx|jsx|html|vue|svelte|astro)$/;

/** Well-known secret formats (prefix + length), so a real key is never mistaken for prose. */
const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "Stripe secret key", re: /\b(sk|rk)_live_[0-9a-zA-Z]{16,}/ },
  { name: "Anthropic API key", re: /\bsk-ant-[0-9a-zA-Z_-]{20,}/ },
  { name: "OpenAI API key", re: /\bsk-(proj-)?[0-9a-zA-Z_-]{32,}/ },
  { name: "AWS access key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub token", re: /\b(ghp|gho|ghu|ghs|github_pat)_[0-9a-zA-Z_]{30,}/ },
  { name: "Slack token", re: /\bxox[abpr]-[0-9a-zA-Z-]{10,}/ },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "Razorpay secret", re: /\brzp_live_[0-9a-zA-Z]{14,}/ },
  { name: "Private key", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length;

function add(list: Finding[], f: Finding) {
  list.push(f);
}

export function scanProject(all: Record<string, string>): ScanReport {
  const files = Object.fromEntries(Object.entries(all).filter(([p]) => SOURCE.test(p) && !SKIP.test(p)));
  const findings: Finding[] = [];

  // ---- Security --------------------------------------------------------------------------
  const secrets: NonNullable<Finding["where"]> = [];
  const secretNames = new Set<string>();
  for (const [path, text] of Object.entries(files)) {
    for (const { name, re } of SECRET_PATTERNS) {
      const m = re.exec(text);
      if (m) {
        secrets.push({ path, line: lineOf(text, m.index) });
        secretNames.add(name);
      }
    }
  }
  add(
    findings,
    secrets.length
      ? { id: "secrets", category: "security", severity: "error", title: "API keys in your code", detail: `Found what looks like ${[...secretNames].join(", ")}. Anything in the source is public once published. Move it to a server-side environment variable and rotate the key.`, where: secrets }
      : { id: "secrets", category: "security", severity: "pass", title: "No API keys in the code", detail: "No known secret key formats were found in the source files." },
  );

  // Client-exposed env vars with secret-sounding names (Vite inlines every VITE_* into the bundle).
  const envFiles = Object.entries(all).filter(([p]) => /(^|\/)\.env(\.[a-z]+)?$/.test(p) && !/\.example$/.test(p));
  const exposed: NonNullable<Finding["where"]> = [];
  for (const [path, text] of envFiles) {
    text.split("\n").forEach((line, i) => {
      if (/^\s*(VITE_|NEXT_PUBLIC_|PUBLIC_)[A-Z0-9_]*(SECRET|PRIVATE|PASSWORD|TOKEN)[A-Z0-9_]*\s*=\s*\S/.test(line)) exposed.push({ path, line: i + 1 });
    });
  }
  if (exposed.length)
    add(findings, { id: "public-env", category: "security", severity: "error", title: "Secret-looking variables exposed to the browser", detail: "Variables starting with VITE_, NEXT_PUBLIC_ or PUBLIC_ are built into the public JavaScript. Secrets must stay on a server.", where: exposed });

  const unsafe: NonNullable<Finding["where"]> = [];
  const html: NonNullable<Finding["where"]> = [];
  for (const [path, text] of Object.entries(files)) {
    if (!/\.(tsx|jsx|ts|js|mjs|vue|svelte|html)$/.test(path)) continue;
    for (const m of text.matchAll(/\beval\s*\(|\bnew Function\s*\(/g)) unsafe.push({ path, line: lineOf(text, m.index ?? 0) });
    for (const m of text.matchAll(/dangerouslySetInnerHTML|\.innerHTML\s*=(?!=)/g)) html.push({ path, line: lineOf(text, m.index ?? 0) });
  }
  add(
    findings,
    unsafe.length
      ? { id: "eval", category: "security", severity: "error", title: "Code that runs strings as code", detail: "eval() or new Function() can run attacker-controlled text. Replace them with normal functions or JSON.parse.", where: unsafe }
      : { id: "eval", category: "security", severity: "pass", title: "No eval or new Function", detail: "Nothing runs text as code." },
  );
  if (html.length)
    add(findings, { id: "raw-html", category: "security", severity: "warning", title: "Raw HTML is inserted into the page", detail: "dangerouslySetInnerHTML / innerHTML can allow cross-site scripting if the HTML comes from users. Make sure it is trusted or sanitised.", where: html });

  const blank: NonNullable<Finding["where"]> = [];
  const insecure: NonNullable<Finding["where"]> = [];
  for (const [path, text] of Object.entries(files)) {
    if (!MARKUP.test(path)) continue;
    for (const m of text.matchAll(/<a\b[^>]*target=["'{]+_blank[^>]*>/g)) if (!/rel=/.test(m[0])) blank.push({ path, line: lineOf(text, m.index ?? 0) });
    for (const m of text.matchAll(/\b(src|href)=["']http:\/\/(?!localhost|127\.0\.0\.1)[^"']+["']/g)) insecure.push({ path, line: lineOf(text, m.index ?? 0) });
  }
  if (blank.length) add(findings, { id: "noopener", category: "security", severity: "warning", title: "Links open new tabs without rel=\"noopener\"", detail: "Add rel=\"noopener noreferrer\" to links with target=\"_blank\".", where: blank.slice(0, 20) });
  if (insecure.length) add(findings, { id: "http", category: "security", severity: "warning", title: "Insecure http:// resources", detail: "Browsers block or warn about http:// images and scripts on an https:// site. Use https:// URLs.", where: insecure.slice(0, 20) });

  // ---- SEO (index.html) -------------------------------------------------------------------
  const indexPath = ["index.html", "public/index.html"].find((p) => p in all);
  const index = indexPath ? all[indexPath] : null;
  if (index) {
    const where = [{ path: indexPath! }];
    const title = index.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
    const generic = /^(vite \+ react( \+ ts)?|vite app|react app|document|untitled|home)$/i.test(title);
    add(
      findings,
      !title || generic
        ? { id: "title", category: "seo", severity: "warning", title: title ? `Generic page title "${title}"` : "Missing page title", detail: "Search results and browser tabs show the title. Use your product name and what it does.", where }
        : { id: "title", category: "seo", severity: "pass", title: "Page title is set", detail: `"${title}"` },
    );
    const desc = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(index);
    add(
      findings,
      desc
        ? { id: "description", category: "seo", severity: "pass", title: "Meta description is set", detail: "Search engines can show your own summary." }
        : { id: "description", category: "seo", severity: "warning", title: "No meta description", detail: "Add a one-sentence <meta name=\"description\"> so search results show your summary.", where },
    );
    if (!/<html[^>]+lang=/i.test(index)) add(findings, { id: "lang", category: "seo", severity: "warning", title: "Page language is not set", detail: "Add lang=\"en\" (or your language) to <html> for screen readers and search engines.", where });
    if (!/<meta[^>]+name=["']viewport/i.test(index)) add(findings, { id: "viewport", category: "seo", severity: "error", title: "Not set up for phones", detail: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> or the site renders tiny on mobile.", where });
    if (!/<meta[^>]+property=["']og:(title|image)/i.test(index))
      add(findings, { id: "social", category: "seo", severity: "warning", title: "No social preview", detail: "Add og:title, og:description and og:image so links shared on WhatsApp, X or LinkedIn show a card.", where });
    if (!/<link[^>]+rel=["'](icon|shortcut icon)/i.test(index)) add(findings, { id: "favicon", category: "quality", severity: "warning", title: "No favicon", detail: "Add <link rel=\"icon\"> so the browser tab shows your logo.", where });
  }

  // ---- Accessibility / quality --------------------------------------------------------------
  const noAlt: NonNullable<Finding["where"]> = [];
  const ids = new Set<string>();
  const anchors: { id: string; path: string; line: number }[] = [];
  for (const [path, text] of Object.entries(all)) {
    if (SKIP.test(path)) continue;
    for (const m of text.matchAll(/\bid=["']([A-Za-z][\w-]*)["']/g)) ids.add(m[1]);
    for (const m of text.matchAll(/"id"\s*:\s*"([A-Za-z][\w-]*)"/g)) ids.add(m[1]);
    // Fallback ids in components: id={section.id ?? "contact"}.
    for (const m of text.matchAll(/\bid=\{[^}]*\?\?\s*["']([A-Za-z][\w-]*)["']/g)) ids.add(m[1]);
    if (!MARKUP.test(path)) continue;
    for (const m of text.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) noAlt.push({ path, line: lineOf(text, m.index ?? 0) });
    for (const m of text.matchAll(/href=["']#([A-Za-z][\w-]*)["']/g)) anchors.push({ id: m[1], path, line: lineOf(text, m.index ?? 0) });
  }
  // Data-driven pages keep hrefs in data files: "href": "#menu".
  for (const [path, text] of Object.entries(files)) for (const m of text.matchAll(/"href"\s*:\s*"#([A-Za-z][\w-]*)"/g)) anchors.push({ id: m[1], path, line: lineOf(text, m.index ?? 0) });
  add(
    findings,
    noAlt.length
      ? { id: "alt", category: "quality", severity: "warning", title: `${noAlt.length} image${noAlt.length === 1 ? "" : "s"} without alt text`, detail: "Screen readers and search engines need a short description. Use alt=\"\" for purely decorative images.", where: noAlt.slice(0, 20) }
      : { id: "alt", category: "quality", severity: "pass", title: "Images have alt text", detail: "Every <img> has an alt attribute." },
  );
  const dead = anchors.filter((a) => !ids.has(a.id));
  add(
    findings,
    dead.length
      ? { id: "anchors", category: "quality", severity: "warning", title: `${dead.length} link${dead.length === 1 ? "" : "s"} to sections that do not exist`, detail: `Links point at ${[...new Set(dead.map((d) => `#${d.id}`))].slice(0, 6).join(", ")} but no element has that id.`, where: dead.slice(0, 20).map(({ path, line }) => ({ path, line })) }
      : { id: "anchors", category: "quality", severity: "pass", title: "In-page links work", detail: "Every #link points at an element on the page." },
  );

  // ---- Performance (source) ----------------------------------------------------------------
  const heavy = Object.entries(all)
    .filter(([p, c]) => /(^|\/)(public|src\/assets)\//.test(p) && c.length > 400_000)
    .map(([path]) => ({ path }));
  if (heavy.length) add(findings, { id: "heavy", category: "performance", severity: "warning", title: "Large files will slow the first load", detail: "Compress images (WebP/AVIF, under ~300 KB) and avoid shipping large files the first screen does not need.", where: heavy });

  const counts: Record<Severity, number> = { error: 0, warning: 0, pass: 0 };
  for (const f of findings) counts[f.severity]++;
  return { findings, counts, scannedFiles: Object.keys(files).length };
}

// ---------------------------------------------------------------------------------------------
// Speed & SEO report on the published files
// ---------------------------------------------------------------------------------------------

export type SiteFile = { path: string; bytes: Uint8Array };
export type SiteReport = {
  score: { performance: number; seo: number };
  totals: { files: number; bytes: number; jsBytes: number; jsGzip: number; cssBytes: number; cssGzip: number; imageBytes: number; htmlGzip: number };
  largest: { path: string; bytes: number }[];
  findings: Finding[];
};

const KB = (n: number) => `${Math.round(n / 1024).toLocaleString("en-US")} KB`;

export async function gzipSize(bytes: Uint8Array): Promise<number> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("gzip"));
  return (await new Response(stream).arrayBuffer()).byteLength;
}

/** Measure the built site: what a first visit downloads (compressed), plus SEO tags in index.html. */
export async function siteReport(files: SiteFile[]): Promise<SiteReport> {
  const ext = (p: string) => p.split(".").pop()?.toLowerCase() ?? "";
  const index = files.find((f) => f.path === "index.html");
  const html = index ? new TextDecoder().decode(index.bytes) : "";
  // What the first page load actually requests: scripts and stylesheets linked from index.html.
  const linked = new Set<string>();
  for (const m of html.matchAll(/<(?:script[^>]+src|link[^>]+href)=["']\/?([^"'?#]+)["']/g)) linked.add(m[1].replace(/^\.\//, ""));
  let jsBytes = 0, jsGzip = 0, cssBytes = 0, cssGzip = 0, imageBytes = 0, bytes = 0;
  for (const f of files) {
    bytes += f.bytes.byteLength;
    const e = ext(f.path);
    if (/^(png|jpe?g|gif|webp|avif|svg)$/.test(e)) imageBytes += f.bytes.byteLength;
    if (!linked.has(f.path)) continue;
    if (e === "js" || e === "mjs") {
      jsBytes += f.bytes.byteLength;
      jsGzip += await gzipSize(f.bytes);
    } else if (e === "css") {
      cssBytes += f.bytes.byteLength;
      cssGzip += await gzipSize(f.bytes);
    }
  }
  const htmlGzip = index ? await gzipSize(index.bytes) : 0;
  const firstLoad = jsGzip + cssGzip + htmlGzip;

  const findings: Finding[] = [];
  findings.push(
    firstLoad <= 200_000
      ? { id: "weight", category: "performance", severity: "pass", title: `First load is ${KB(firstLoad)} compressed`, detail: "HTML, CSS and JavaScript for the first visit are well under the 200 KB budget for fast phones on 4G." }
      : { id: "weight", category: "performance", severity: firstLoad > 500_000 ? "error" : "warning", title: `First load is ${KB(firstLoad)} compressed`, detail: "Aim for under 200 KB. Split rarely used pages with lazy imports and remove unused libraries." },
  );
  const bigImages = files.filter((f) => /\.(png|jpe?g|gif)$/i.test(f.path) && f.bytes.byteLength > 300_000);
  findings.push(
    bigImages.length
      ? { id: "images", category: "performance", severity: "warning", title: `${bigImages.length} large image${bigImages.length === 1 ? "" : "s"}`, detail: "Convert to WebP or AVIF and resize to the size shown on screen.", where: bigImages.map((f) => ({ path: f.path })) }
      : { id: "images", category: "performance", severity: "pass", title: "Images are a reasonable size", detail: imageBytes ? `${KB(imageBytes)} of images in total.` : "No raster images." },
  );
  const has = (re: RegExp) => re.test(html);
  const seoChecks: [string, boolean, string, string][] = [
    ["title", has(/<title>[^<]{3,}<\/title>/i) && !has(/<title>\s*(vite \+ react|vite app|react app)/i), "Page title", "Add a specific <title>."],
    ["description", has(/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i), "Meta description", "Add <meta name=\"description\">."],
    ["viewport", has(/<meta[^>]+name=["']viewport/i), "Mobile viewport", "Add the viewport meta tag."],
    ["lang", has(/<html[^>]+lang=/i), "Page language", "Add lang to <html>."],
    ["social", has(/<meta[^>]+property=["']og:/i), "Social preview (Open Graph)", "Add og:title, og:description and og:image."],
    ["favicon", has(/<link[^>]+rel=["'](icon|shortcut icon)/i), "Favicon", "Add <link rel=\"icon\">."],
  ];
  for (const [id, ok, title, fix] of seoChecks) findings.push({ id: `seo-${id}`, category: "seo", severity: ok ? "pass" : "warning", title, detail: ok ? "Present." : fix, where: ok ? undefined : [{ path: "index.html" }] });

  // Scores follow the evidence: start at 100 and lose points per measured problem.
  const perf = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, firstLoad - 150_000) / 6_000 - bigImages.length * 6)));
  const seoPassed = seoChecks.filter(([, ok]) => ok).length;
  const seo = Math.round((seoPassed / seoChecks.length) * 100);
  const largest = [...files].sort((a, b) => b.bytes.byteLength - a.bytes.byteLength).slice(0, 5).map((f) => ({ path: f.path, bytes: f.bytes.byteLength }));
  return { score: { performance: perf, seo }, totals: { files: files.length, bytes, jsBytes, jsGzip, cssBytes, cssGzip, imageBytes, htmlGzip }, largest, findings };
}
