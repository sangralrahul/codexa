import { describe, expect, it } from "vitest";
import { guessColors, pwaFiles } from "@/lib/services/pwa";

const VITE = {
  "index.html": `<!doctype html>\n<html lang="en">\n  <head>\n    <title>Larder</title>\n  </head>\n  <body><div id="root"></div></body>\n</html>\n`,
  "src/main.tsx": `import "./index.css";\ncreateRoot(document.getElementById("root")!).render(<App />);\n`,
  "src/index.css": `@theme { --color-bg: #faf8f5; --color-accent: #c2410c; }`,
};

describe("pwaFiles", () => {
  it("adds manifest, icon, service worker and offline page to a Vite project, idempotently", () => {
    const o = { name: "Larder & Loaf", ...guessColors(VITE) };
    expect(o).toMatchObject({ themeColor: "#c2410c", backgroundColor: "#faf8f5" });
    const out = pwaFiles("vite-react", VITE, o)!;
    expect(Object.keys(out).sort()).toEqual(["index.html", "public/icon.svg", "public/manifest.webmanifest", "public/offline.html", "public/sw.js", "src/main.tsx"]);
    const manifest = JSON.parse(out["public/manifest.webmanifest"]);
    expect(manifest).toMatchObject({ name: "Larder & Loaf", display: "standalone", theme_color: "#c2410c", start_url: "/" });
    expect(out["index.html"]).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(out["index.html"]).toContain('content="#c2410c"');
    expect(out["src/main.tsx"]).toContain('navigator.serviceWorker.register("/sw.js")');
    expect(out["public/icon.svg"]).toContain(">L</text>");
    // Running it again on the result changes nothing in index.html or main.tsx.
    const again = pwaFiles("vite-react", { ...VITE, ...out }, o)!;
    expect(again["index.html"]).toBe(out["index.html"]);
    expect(again["src/main.tsx"]).toBeUndefined();
  });

  it("registers inline for static sites and refuses projects without index.html", () => {
    const out = pwaFiles("static", { "index.html": "<html><head></head><body></body></html>" }, { name: "Shop", themeColor: "#111111", backgroundColor: "#ffffff" })!;
    expect(out["sw.js"]).toBeDefined();
    expect(out["index.html"]).toContain('navigator.serviceWorker.register("/sw.js")');
    expect(pwaFiles("vite-react", { "src/main.tsx": "" }, { name: "x", themeColor: "#111111", backgroundColor: "#ffffff" })).toBeNull();
  });
});
