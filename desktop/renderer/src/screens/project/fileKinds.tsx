import { Braces, FileCode2, FileJson2, FileText, FileType2, Hash, Image, Palette } from "lucide-react";
import { cn } from "../../lib/util";

/** File-type icon and tint, like an IDE's explorer. */
// File-type colours follow the familiar editor conventions (TypeScript blue, JavaScript yellow, …):
// the one place the monochrome UI keeps colour, so files are recognisable at a glance.
// Kept out of CodeView so the chat can show the same icons without loading Monaco.
const KINDS: Record<string, { icon: typeof FileCode2; tint: string; label: string }> = {
  tsx: { icon: Braces, tint: "text-[#3178c6]", label: "TypeScript React" },
  ts: { icon: Braces, tint: "text-[#3178c6]", label: "TypeScript" },
  jsx: { icon: Braces, tint: "text-[#e8a317]", label: "JavaScript React" },
  js: { icon: Braces, tint: "text-[#e8a317]", label: "JavaScript" },
  mjs: { icon: Braces, tint: "text-[#e8a317]", label: "JavaScript" },
  cjs: { icon: Braces, tint: "text-[#e8a317]", label: "JavaScript" },
  json: { icon: FileJson2, tint: "text-[#b8860b]", label: "JSON" },
  css: { icon: Palette, tint: "text-[#7c4dff]", label: "CSS" },
  scss: { icon: Palette, tint: "text-[#c6538c]", label: "SCSS" },
  html: { icon: FileCode2, tint: "text-[#e44d26]", label: "HTML" },
  md: { icon: FileText, tint: "text-muted", label: "Markdown" },
  svg: { icon: Image, tint: "text-[#ff9800]", label: "SVG" },
  png: { icon: Image, tint: "text-[#2a9d8f]", label: "Image" },
  jpg: { icon: Image, tint: "text-[#2a9d8f]", label: "Image" },
  webp: { icon: Image, tint: "text-[#2a9d8f]", label: "Image" },
  yml: { icon: Hash, tint: "text-[#cb171e]", label: "YAML" },
  yaml: { icon: Hash, tint: "text-[#cb171e]", label: "YAML" },
  sql: { icon: FileType2, tint: "text-[#2a9d8f]", label: "SQL" },
};

export function kindOf(path: string) {
  const name = path.split("/").pop() ?? "";
  if (name === ".gitignore" || name === ".env" || name.startsWith(".env.")) return { icon: FileText, tint: "text-dim", label: "Config" };
  return KINDS[name.split(".").pop()?.toLowerCase() ?? ""] ?? { icon: FileText, tint: "text-dim", label: "Plain text" };
}

export function FileIcon({ path, className }: { path: string; className?: string }) {
  const k = kindOf(path);
  return <k.icon className={cn("size-3.5 shrink-0", k.tint, className)} aria-hidden="true" />;
}
