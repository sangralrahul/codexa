import "server-only";

import type { Template } from "@/templates";

/** Resolve `href` against the directory of `from` inside the template's virtual file system. */
function resolve(from: string, href: string): string | null {
  if (/^([a-z]+:|\/\/|#|\?)/i.test(href)) return null;
  const clean = href.split(/[?#]/)[0];
  const stack = clean.startsWith("/") ? [] : from.split("/").slice(0, -1);
  for (const part of clean.replace(/^\//, "").split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

/** One page with its stylesheets and scripts inlined (only files that exist in the template). */
function inlinePage(files: Record<string, string>, path: string): string {
  let html = files[path] ?? "";
  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, (tag) => {
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    const file = href ? resolve(path, href) : null;
    return file && file in files ? `<style>${files[file].replace(/<\/style/gi, "<\\/style")}</style>` : tag;
  });
  html = html.replace(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi, (tag, a: string, src: string, b: string) => {
    const file = resolve(path, src);
    const attrs = `${a} ${b}`.replace(/\s+/g, " ").trim();
    return file && file in files ? `<script${attrs ? ` ${attrs}` : ""}>${files[file].replace(/<\/script/gi, "<\\/script")}</script>` : tag;
  });
  return html;
}

/**
 * In-frame router for links between the template's own pages: document.write()s the target page
 * and re-installs itself. Plain ES5 kept as a raw string so the frame runs exactly this source.
 */
const ROUTER = String.raw`function boot(P,cur){function res(f,h){if(/^([a-z]+:|\/\/|#|\?)/i.test(h))return null;var c=h.split(/[?#]/)[0];var s=c.charAt(0)==="/"?[]:f.split("/").slice(0,-1);c.replace(/^\//,"").split("/").forEach(function(x){if(!x||x===".")return;if(x==="..")s.pop();else s.push(x)});var r=s.join("/");if(r==="")r="index.html";if(!P[r]&&P[r+"/index.html"])r=r+"/index.html";return P[r]?r:null}document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a)return;var h=a.getAttribute("href")||"";if(h.charAt(0)==="#")return;e.preventDefault();var to=res(cur,h);if(!to)return;var tag="<"+"script>("+boot.toString()+")("+JSON.stringify(P).replace(/</g,"\\u003c")+","+JSON.stringify(to)+")<"+"/script>";var html=P[to];html=html.indexOf("</body>")>=0?html.replace("</body>",tag+"</body>"):html+tag;document.open();document.write(html);document.close()})}`;

/**
 * "Run it here" (PLAN §5.4, stretch): a self-contained srcdoc for a static template, built on the
 * server from the template's own files. CSS and JS are inlined; links between the template's own
 * pages are handled in-frame (the frame has an opaque origin: sandbox="allow-scripts" only, so it
 * cannot reach this site, its cookies or storage). Returns null for templates with a build step.
 */
export function staticSrcDoc(t: Template): string | null {
  if (t.framework !== "static" || !t.files["index.html"]) return null;
  const pages: Record<string, string> = {};
  for (const p of Object.keys(t.files)) if (p.endsWith(".html")) pages[p] = inlinePage(t.files, p);
  const tag = `<script>(${ROUTER})(${JSON.stringify(pages).replace(/</g, "\\u003c")},"index.html")</script>`;
  const index = pages["index.html"];
  return index.includes("</body>") ? index.replace("</body>", `${tag}</body>`) : index + tag;
}
