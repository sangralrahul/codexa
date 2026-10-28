/**
 * "Make installable": turns a Vite or static project into a Progressive Web App, so phones offer
 * "Add to Home screen" and it opens full-screen with an icon and an offline page. Writes a web
 * manifest, an SVG icon, a small service worker and an offline page, and links them from
 * index.html (plus the service-worker registration). Pure: takes and returns file contents, so
 * it is easy to test and safe to run twice (it updates instead of duplicating).
 */
export type PwaOptions = { name: string; themeColor: string; backgroundColor: string };

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

export function iconSvg(name: string, color: string) {
  const letter = (name.trim().match(/[A-Za-z0-9]/)?.[0] ?? "A").toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${color}"/><text x="256" y="338" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="260" font-weight="700" fill="#ffffff">${escapeXml(letter)}</text></svg>\n`;
}

export function manifest(o: PwaOptions) {
  const short = o.name.length > 12 ? o.name.split(/\s+/)[0].slice(0, 12) : o.name;
  return `${JSON.stringify(
    {
      name: o.name,
      short_name: short,
      start_url: "/",
      scope: "/",
      display: "standalone",
      theme_color: o.themeColor,
      background_color: o.backgroundColor,
      icons: [
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      ],
    },
    null,
    2,
  )}\n`;
}

export const SERVICE_WORKER = `// Service worker added by Codexa "Make installable": pages are fetched from the network first
// (so updates show immediately) with an offline page as the fallback; static assets are cached.
const CACHE = "app-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icon.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  if (/\\.(js|css|svg|png|jpe?g|webp|avif|woff2?)$/.test(new URL(req.url).pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
  }
});
`;

export function offlinePage(o: PwaOptions) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Offline · ${escapeXml(o.name)}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: ${o.backgroundColor}; color: #111; }
      main { text-align: center; padding: 2rem; max-width: 26rem; }
      img { width: 64px; height: 64px; }
      h1 { font-size: 1.4rem; margin: 1rem 0 0.4rem; }
      p { color: #555; line-height: 1.5; }
      button { margin-top: 1rem; font: inherit; padding: 0.6rem 1.1rem; border-radius: 10px; border: 0; background: ${o.themeColor}; color: #fff; cursor: pointer; }
    </style>
  </head>
  <body>
    <main>
      <img src="/icon.svg" alt="" />
      <h1>You are offline</h1>
      <p>${escapeXml(o.name)} needs a connection for this page. Check your internet and try again.</p>
      <button onclick="location.reload()">Try again</button>
    </main>
  </body>
</html>
`;
}

const REGISTER_MARK = "codexa:pwa";
const registerSnippet = (prodOnly: boolean) =>
  `// ${REGISTER_MARK}: register the service worker (installable app + offline page)\nif ("serviceWorker" in navigator${prodOnly ? " && import.meta.env.PROD" : ""}) {\n  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));\n}\n`;

/** Insert or update the PWA tags in <head>. */
export function patchIndexHtml(html: string, o: PwaOptions, inlineRegister: boolean) {
  let out = html;
  const head = (tag: string, test: RegExp) => {
    if (test.test(out)) return;
    out = out.replace(/<\/head>/i, `    ${tag}\n  </head>`);
  };
  head(`<link rel="manifest" href="/manifest.webmanifest" />`, /rel=["']manifest["']/i);
  if (/<meta[^>]+name=["']theme-color["'][^>]*>/i.test(out)) out = out.replace(/(<meta[^>]+name=["']theme-color["'][^>]+content=["'])[^"']*(["'])/i, `$1${o.themeColor}$2`);
  else head(`<meta name="theme-color" content="${o.themeColor}" />`, /name=["']theme-color/i);
  head(`<link rel="icon" href="/icon.svg" type="image/svg+xml" />`, /rel=["'](icon|shortcut icon)["']/i);
  head(`<link rel="apple-touch-icon" href="/icon.svg" />`, /rel=["']apple-touch-icon["']/i);
  head(`<meta name="apple-mobile-web-app-capable" content="yes" />`, /apple-mobile-web-app-capable/i);
  if (inlineRegister && !out.includes(REGISTER_MARK)) out = out.replace(/<\/body>/i, `    <script>\n${registerSnippet(false)}    </script>\n  </body>`);
  return out;
}

/**
 * Files to write for a project (framework "vite-react" or "static"); null when the project has no
 * index.html to attach to. Vite serves public/ at the site root; static projects use the root.
 */
export function pwaFiles(framework: string, files: Record<string, string>, o: PwaOptions): Record<string, string> | null {
  const isVite = framework === "vite-react";
  const indexPath = "index.html";
  if (!(indexPath in files)) return null;
  const root = isVite ? "public/" : "";
  const out: Record<string, string> = {
    [`${root}manifest.webmanifest`]: manifest(o),
    [`${root}icon.svg`]: iconSvg(o.name, o.themeColor),
    [`${root}sw.js`]: SERVICE_WORKER,
    [`${root}offline.html`]: offlinePage(o),
    [indexPath]: patchIndexHtml(files[indexPath], o, !isVite),
  };
  if (isVite) {
    const main = ["src/main.tsx", "src/main.ts", "src/main.jsx", "src/main.js"].find((p) => p in files);
    if (main && !files[main].includes(REGISTER_MARK)) out[main] = `${files[main].replace(/\s*$/, "\n")}\n${registerSnippet(true)}`;
  }
  return out;
}

/** Best guess at the app's colours: index.html theme-color, then a --color-accent token, else neutral. */
export function guessColors(files: Record<string, string>): { themeColor: string; backgroundColor: string } {
  const hex = (s: string | undefined) => (s && /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : undefined);
  const meta = hex(files["index.html"]?.match(/name=["']theme-color["'][^>]+content=["']([^"']+)/i)?.[1]);
  const css = Object.entries(files).find(([p]) => /\.css$/.test(p))?.[1] ?? "";
  const accent = hex(css.match(/--color-accent:\s*(#[0-9a-fA-F]{6})/)?.[1]);
  const bg = hex(css.match(/--color-bg:\s*(#[0-9a-fA-F]{6})/)?.[1]);
  return { themeColor: accent ?? meta ?? "#111111", backgroundColor: bg ?? "#ffffff" };
}
