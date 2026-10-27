import "server-only";
import { FRAMEWORKS, type Template } from "@/templates";

export type ReadmeBlock = { kind: "p" | "h" | "code" | "ul"; text: string; items?: string[] };

/** What the in-app preview sheet needs for one template (no file contents beyond the README). */
export type TemplateSheetDetail = {
  readme: ReadmeBlock[];
  paths: string[];
  dependencyCount: number;
  devCommand: string;
  frameworkName: string;
};

/**
 * A short, structured excerpt of the template's README (first heading dropped): paragraphs,
 * sub-headings, bullet lists and code fences, up to `max` blocks. Falls back to the long
 * description when the README says nothing beyond install commands.
 */
export function readmeExcerpt(t: Template, max = 6): ReadmeBlock[] {
  const md = t.files["README.md"] ?? "";
  const blocks: ReadmeBlock[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ").replace(/\*\*(.+?)\*\*/g, "$1").trim() });
    para = [];
  };
  let sawTitle = false;
  while (i < lines.length && blocks.length < max) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
      blocks.push({ kind: "code", text: code.join("\n") });
    } else if (/^#\s/.test(line) && !sawTitle) {
      sawTitle = true;
    } else if (/^#{1,4}\s/.test(line)) {
      flush();
      blocks.push({ kind: "h", text: line.replace(/^#+\s*/, "") });
    } else if (/^\s*[-*]\s/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s/, "").replace(/\*\*(.+?)\*\*/g, "$1"));
      blocks.push({ kind: "ul", text: "", items });
      continue;
    } else if (line.trim() === "") {
      flush();
    } else {
      para.push(line.trim());
    }
    i++;
  }
  flush();
  const prose = blocks.filter((b) => b.kind !== "code").map((b) => b.text).join(" ");
  if (prose.length < 60 || /^Generated with Codexa/i.test(prose)) {
    return [{ kind: "p", text: t.longDescription ?? t.description }, ...blocks.filter((b) => b.kind === "code").slice(0, 1)];
  }
  return blocks.slice(0, max);
}

export function templateSheetDetail(t: Template): TemplateSheetDetail {
  return {
    readme: readmeExcerpt(t),
    paths: Object.keys(t.files),
    dependencyCount: Object.keys(t.dependencies).length,
    devCommand: t.settings.devCommand || FRAMEWORKS[t.framework].devCommand,
    frameworkName: FRAMEWORKS[t.framework].name,
  };
}
