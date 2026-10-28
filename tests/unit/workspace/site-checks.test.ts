import { describe, expect, it } from "vitest";
import { scanProject, siteReport } from "@/lib/services/site-checks";
import { TEMPLATES } from "@/templates";

const enc = (s: string) => new TextEncoder().encode(s);

describe("scanProject", () => {
  it("flags exposed keys, eval, public secret env vars and SEO gaps with file and line", () => {
    const r = scanProject({
      "src/App.tsx": `const key = "sk_live_${"a".repeat(24)}";\nexport default function App() {\n  return <a href="#pricing" target="_blank">Go</a>;\n}\n<img src="/x.png">`,
      "src/util.ts": "export const run = (s: string) => eval(s);",
      ".env": "VITE_STRIPE_SECRET=abc",
      "index.html": "<html><head><title>Vite + React + TS</title></head><body></body></html>",
    });
    const byId = Object.fromEntries(r.findings.map((f) => [f.id, f]));
    expect(byId.secrets.severity).toBe("error");
    expect(byId.secrets.where).toEqual([{ path: "src/App.tsx", line: 1 }]);
    expect(byId.eval.severity).toBe("error");
    expect(byId["public-env"].severity).toBe("error");
    expect(byId.title.severity).toBe("warning");
    expect(byId.viewport.severity).toBe("error");
    expect(byId.alt.severity).toBe("warning");
    expect(byId.anchors.severity).toBe("warning");
    expect(byId.noopener.severity).toBe("warning");
    expect(r.counts.error).toBe(4);
  });

  it("passes a clean project", () => {
    const r = scanProject({
      "index.html": `<html lang="en"><head><title>Larder</title><meta name="viewport" content="width=device-width"><meta name="description" content="Bread and coffee on Alder Street."><meta property="og:title" content="Larder"><link rel="icon" href="/i.svg"></head></html>`,
      "src/App.tsx": `export default () => <main><a href="#menu">Menu</a><section id="menu"><img src="/a.webp" alt="Loaves" /></section></main>;`,
    });
    expect(r.counts.error).toBe(0);
    expect(r.counts.warning).toBe(0);
  });

  it("finds no security errors in any gallery template", () => {
    for (const t of TEMPLATES) {
      const errors = scanProject(t.files).findings.filter((f) => f.severity === "error" && f.category === "security");
      expect(errors.map((e) => `${t.id}: ${e.title}`)).toEqual([]);
    }
  });
});

describe("siteReport", () => {
  it("measures the first load from the files index.html links, and scores SEO tags", async () => {
    const js = enc("console.log('x');".repeat(2000));
    const r = await siteReport([
      { path: "index.html", bytes: enc(`<html lang="en"><head><title>Shop</title><meta name="viewport" content="x"><script type="module" src="/assets/index-abc.js"></script><link rel="stylesheet" href="/assets/index-abc.css"></head></html>`) },
      { path: "assets/index-abc.js", bytes: js },
      { path: "assets/index-abc.css", bytes: enc("body{margin:0}") },
      { path: "assets/unused.js", bytes: enc("x".repeat(5000)) },
    ]);
    expect(r.totals.jsBytes).toBe(js.byteLength);
    expect(r.totals.jsGzip).toBeGreaterThan(0);
    expect(r.totals.jsGzip).toBeLessThan(js.byteLength / 10);
    expect(r.score.performance).toBe(100);
    expect(r.score.seo).toBe(50); // title, viewport, lang of 6
  });
});
