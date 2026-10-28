import { describe, expect, it } from "vitest";
import { applyClassChanges, cssColorToHex, describeChange, previewStyle } from "@/lib/client/workspace/tailwind-edit";
import { injectInspector, INSPECTOR_TAG } from "../../../services/runner/inspector";

describe("applyClassChanges", () => {
  it("swaps only the matching base utility group", () => {
    const cls = "mt-4 text-lg font-semibold text-slate-900 md:text-xl hover:text-slate-700 text-center";
    expect(applyClassChanges(cls, { color: "#0F766E" })).toBe("mt-4 text-lg font-semibold md:text-xl hover:text-slate-700 text-center text-[#0f766e]");
    expect(applyClassChanges(cls, { fontSize: "2xl" })).toBe("mt-4 font-semibold text-slate-900 md:text-xl hover:text-slate-700 text-center text-2xl");
    expect(applyClassChanges(cls, { align: "left", fontWeight: "bold" })).toBe("mt-4 text-lg text-slate-900 md:text-xl hover:text-slate-700 font-bold text-left");
  });

  it("handles backgrounds, padding and corners without touching non-colour bg utilities", () => {
    const cls = "bg-cover bg-accent px-5 py-2 rounded-card p-1";
    expect(applyClassChanges(cls, { background: "#ffffff", padding: "6", radius: "full" })).toBe("bg-cover rounded-card bg-[#ffffff] p-6 rounded-full");
  });

  it("ignores invalid colours", () => {
    expect(applyClassChanges("text-red-500", { color: "red" })).toBe("text-red-500");
  });

  it("describes and previews changes", () => {
    expect(describeChange({ fontSize: "xl", padding: "4" })).toEqual(["font size → xl (20px)", "padding → 16px"]);
    expect(previewStyle({ color: "#112233", radius: "lg" })).toEqual({ color: "#112233", "border-radius": "8px" });
    expect(cssColorToHex("rgb(15, 118, 110)")).toBe("#0f766e");
    expect(cssColorToHex("rgba(0, 0, 0, 0)")).toBeNull();
  });
});

describe("injectInspector", () => {
  it("adds the inspector once, before </head>", () => {
    const html = "<!doctype html><html><head><title>x</title></head><body></body></html>";
    const out = injectInspector(html);
    expect(out).toContain(`${INSPECTOR_TAG}</head>`);
    expect(injectInspector(out)).toBe(out);
    expect(injectInspector("<p>no head</p>")).toBe(`<p>no head</p>${INSPECTOR_TAG}`);
  });
});
