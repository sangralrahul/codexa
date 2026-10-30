import { Braces, File, FileCode2, FileImage, FileJson, FileText, FileType, Globe, Lock, Palette, Settings2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Icon + colour token for a file name, so the tree and tabs read at a glance. */
export function fileIconFor(name: string): { Icon: LucideIcon; tone: string } {
  const lower = name.toLowerCase();
  const ext = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  if (lower === "package.json" || lower === "package-lock.json") return { Icon: Braces, tone: "text-success" };
  if (lower.startsWith(".env")) return { Icon: Lock, tone: "text-warning" };
  if (lower.startsWith(".") || /(^|\.)config\.(t|j|mj|cj)s$/.test(lower) || lower.startsWith("tsconfig")) return { Icon: Settings2, tone: "text-muted-foreground" };
  switch (ext) {
    case "ts":
    case "tsx":
      return { Icon: FileCode2, tone: "text-info" };
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return { Icon: FileCode2, tone: "text-warning" };
    case "json":
      return { Icon: FileJson, tone: "text-warning" };
    case "css":
    case "scss":
      return { Icon: Palette, tone: "text-primary" };
    case "html":
      return { Icon: Globe, tone: "text-primary" };
    case "md":
    case "mdx":
    case "txt":
      return { Icon: FileText, tone: "text-muted-foreground" };
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
    case "ico":
      return { Icon: FileImage, tone: "text-success" };
    case "woff":
    case "woff2":
    case "ttf":
      return { Icon: FileType, tone: "text-muted-foreground" };
    default:
      return { Icon: File, tone: "text-muted-foreground" };
  }
}

export function FileIcon({ name, className }: { name: string; className?: string }) {
  const { Icon, tone } = fileIconFor(name);
  return <Icon className={cn("size-4 shrink-0", tone, className)} aria-hidden="true" />;
}
