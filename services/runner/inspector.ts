/**
 * The visual-edit inspector, injected into preview HTML by the preview proxy (never into published
 * sites). It does nothing until the Codexa editor that frames the preview turns it on with a
 * postMessage; then it highlights the hovered element, reports a clicked element (tag, classes,
 * text, outline HTML, position, a few computed styles) and can apply temporary inline styles or
 * text so a change can be previewed before it is written to the source files.
 * It only talks to its parent window, and only answers the origin that turned it on.
 */
export const INSPECTOR_PATH = "/__codexa/inspect.js";

export const INSPECTOR_TAG = `<script src="${INSPECTOR_PATH}" defer></script>`;

/** Insert the inspector tag into an HTML document (before </head>, else </body>, else at the end). */
export function injectInspector(html: string): string {
  if (html.includes(INSPECTOR_PATH)) return html;
  const head = html.search(/<\/head>/i);
  if (head >= 0) return html.slice(0, head) + INSPECTOR_TAG + html.slice(head);
  const body = html.search(/<\/body>/i);
  if (body >= 0) return html.slice(0, body) + INSPECTOR_TAG + html.slice(body);
  return html + INSPECTOR_TAG;
}

export const INSPECTOR_JS = `(() => {
  if (window.top === window || window.__codexaInspector) return;
  window.__codexaInspector = true;
  let parentOrigin = null;
  let on = false;
  let hovered = null;
  let selected = null;
  let saved = null;
  const Z = "2147483646";
  const mk = (css) => { const d = document.createElement("div"); d.setAttribute("data-codexa-overlay", ""); d.style.cssText = "position:fixed;pointer-events:none;z-index:" + Z + ";display:none;box-sizing:border-box;" + css; return d; };
  const hoverBox = mk("border:1.5px solid #0ea5e9;background:rgba(14,165,233,.08);border-radius:3px;transition:all .05s linear;");
  const selBox = mk("border:2px solid #0ea5e9;border-radius:3px;box-shadow:0 0 0 4px rgba(14,165,233,.18);");
  const label = mk("font:500 11px/1.5 ui-sans-serif,system-ui,sans-serif;color:#fff;background:#0f172a;padding:1px 6px;border-radius:4px;white-space:nowrap;");
  const mount = () => { if (!hoverBox.isConnected) document.documentElement.append(hoverBox, selBox, label); };
  const post = (msg) => { if (parentOrigin) window.parent.postMessage(Object.assign({ source: "codexa-inspector" }, msg), parentOrigin); };
  const isOverlay = (el) => el && el.hasAttribute && el.hasAttribute("data-codexa-overlay");
  const place = (box, el) => {
    if (!el || !el.isConnected) { box.style.display = "none"; return; }
    const r = el.getBoundingClientRect();
    box.style.display = "block";
    box.style.left = r.left + "px"; box.style.top = r.top + "px"; box.style.width = r.width + "px"; box.style.height = r.height + "px";
  };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "");
  const pathOf = (el) => {
    const out = [];
    for (let n = el; n && n.nodeType === 1 && n !== document.body && out.length < 5; n = n.parentElement) {
      let s = n.tagName.toLowerCase();
      if (n.id) { out.unshift(s + "#" + n.id); break; }
      const p = n.parentElement;
      if (p) { const same = Array.from(p.children).filter((c) => c.tagName === n.tagName); if (same.length > 1) s += ":nth-of-type(" + (same.indexOf(n) + 1) + ")"; }
      out.unshift(s);
    }
    return out.join(" > ");
  };
  const ownText = (el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").replace(/\\s+/g, " ").trim();
  const describe = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const outer = el.outerHTML;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || "",
      classes: el.getAttribute("class") || "",
      text: ownText(el).slice(0, 600),
      textOnly: el.children.length === 0,
      html: outer.length > 900 ? outer.slice(0, 900) + "…" : outer,
      path: pathOf(el),
      rect: { x: r.left, y: r.top, width: r.width, height: r.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      styles: { color: cs.color, backgroundColor: cs.backgroundColor, fontSize: cs.fontSize, fontWeight: cs.fontWeight, textAlign: cs.textAlign, padding: cs.padding, borderRadius: cs.borderRadius },
    };
  };
  const restore = () => {
    if (selected && saved) {
      selected.setAttribute("style", saved.style);
      if (saved.text !== null) selected.textContent = saved.text;
    }
    saved = null;
  };
  const select = (el) => {
    restore();
    selected = el;
    saved = el ? { style: el.getAttribute("style") || "", text: el.children.length === 0 ? el.textContent : null } : null;
    place(selBox, el);
    label.style.display = "none";
    post(el ? Object.assign({ type: "select" }, { element: describe(el) }) : { type: "deselect" });
  };
  const onMove = (e) => {
    if (!on) return;
    const el = e.target;
    if (!el || el === hovered || isOverlay(el) || el === document.documentElement) return;
    hovered = el;
    place(hoverBox, el);
    const r = el.getBoundingClientRect();
    label.textContent = name(el);
    label.style.display = "block";
    label.style.left = Math.max(0, r.left) + "px";
    label.style.top = (r.top > 22 ? r.top - 20 : r.bottom + 4) + "px";
  };
  const onClick = (e) => {
    if (!on) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const el = e.target;
    if (el && !isOverlay(el) && el !== document.documentElement) select(el);
  };
  const block = (e) => { if (on) { e.preventDefault(); e.stopPropagation(); } };
  const reflow = () => { if (selected) { place(selBox, selected); post({ type: "rect", rect: describe(selected).rect }); } if (hovered) place(hoverBox, hovered); };
  window.addEventListener("mousemove", onMove, true);
  window.addEventListener("click", onClick, true);
  window.addEventListener("mousedown", block, true);
  window.addEventListener("submit", block, true);
  window.addEventListener("scroll", reflow, true);
  window.addEventListener("resize", reflow);
  window.addEventListener("keydown", (e) => { if (on && e.key === "Escape") { select(null); post({ type: "escape" }); } }, true);
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;
    const d = e.data;
    if (!d || d.source !== "codexa-editor") return;
    if (parentOrigin && e.origin !== parentOrigin) return;
    if (d.type === "inspect") {
      parentOrigin = e.origin;
      on = Boolean(d.on);
      mount();
      document.documentElement.style.cursor = on ? "crosshair" : "";
      if (!on) { select(null); hoverBox.style.display = "none"; label.style.display = "none"; hovered = null; }
      post({ type: "ready", on });
    } else if (d.type === "preview" && selected && saved) {
      selected.setAttribute("style", saved.style);
      if (d.style) for (const k in d.style) selected.style.setProperty(k, d.style[k]);
      if (typeof d.text === "string" && saved.text !== null) selected.textContent = d.text;
      place(selBox, selected);
    } else if (d.type === "reset") {
      restore();
      if (selected) saved = { style: selected.getAttribute("style") || "", text: selected.children.length === 0 ? selected.textContent : null };
    } else if (d.type === "commit") {
      saved = null;
    } else if (d.type === "deselect") {
      select(null);
    }
  });
  // Announce that this preview can be inspected (the editor enables its Edit button on this).
  const hello = () => window.parent.postMessage({ source: "codexa-inspector", type: "available" }, "*");
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hello); else hello();
})();
`;
