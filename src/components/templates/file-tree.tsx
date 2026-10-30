import Link from "next/link";
import { Braces, ChevronDown, File, FileCode2, FileText, FolderOpen, Globe, Hash, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Node = { name: string; path: string; children?: Node[] };

/** Build a nested tree from flat file paths (folders first, alphabetical). */
export function buildTree(paths: string[]): Node[] {
  const root: Node[] = [];
  for (const p of paths.slice().sort()) {
    const parts = p.split("/");
    let level = root;
    let acc = "";
    parts.forEach((part, i) => {
      acc = acc ? `${acc}/${part}` : part;
      const isFile = i === parts.length - 1;
      let node = level.find((n) => n.name === part && Boolean(n.children) === !isFile);
      if (!node) {
        node = isFile ? { name: part, path: acc } : { name: part, path: acc, children: [] };
        level.push(node);
      }
      if (!isFile) level = node.children!;
    });
  }
  const sort = (nodes: Node[]) => {
    nodes.sort((a, b) => Number(Boolean(b.children)) - Number(Boolean(a.children)) || a.name.localeCompare(b.name));
    nodes.forEach((n) => n.children && sort(n.children));
  };
  sort(root);
  return root;
}

/**
 * Icon and colour for a file name (presentation only). `tone="code"` (default) uses the syntax
 * palette, which is tuned for the dark code pane; `tone="default"` sits on theme surfaces, where
 * those pastels would wash out in light mode, so it keeps one quiet colour.
 */
export function FileGlyph({ name, className, tone = "code" }: { name: string; className?: string; tone?: "default" | "code" }) {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const cls = cn("size-3.5 shrink-0", className);
  const c = (syn: string) => (tone === "code" ? syn : "text-muted-foreground");
  if (/^(package|tsconfig|vite\.config|\.gitignore|\.env)/.test(name)) return <Settings2 className={cn(cls, c("text-code-muted"))} aria-hidden="true" />;
  if (["ts", "tsx", "js", "jsx", "mjs"].includes(ext)) return <FileCode2 className={cn(cls, c("text-syn-fn"))} aria-hidden="true" />;
  if (ext === "json") return <Braces className={cn(cls, c("text-syn-number"))} aria-hidden="true" />;
  if (ext === "css") return <Hash className={cn(cls, c("text-syn-keyword"))} aria-hidden="true" />;
  if (ext === "html") return <Globe className={cn(cls, c("text-syn-tag"))} aria-hidden="true" />;
  if (ext === "md") return <FileText className={cn(cls, c("text-code-muted"))} aria-hidden="true" />;
  return <File className={cn(cls, c("text-code-muted"))} aria-hidden="true" />;
}

/**
 * Server-rendered file tree. With `hrefFor`, each file is a link (?file=… deep links, no client JS)
 * and the selected one is `aria-current="true"`; without it the tree is a read-only listing.
 * `tone="code"` sits on a dark code pane (both themes); default follows the theme.
 */
export function FileTree({
  paths,
  selected,
  hrefFor,
  className,
  tone = "default",
  label = "Template files",
}: {
  paths: string[];
  selected?: string;
  hrefFor?: (path: string) => string;
  className?: string;
  tone?: "default" | "code";
  label?: string;
}) {
  const tree = buildTree(paths);
  const list = <Branch nodes={tree} selected={selected} hrefFor={hrefFor} depth={0} tone={tone} />;
  return hrefFor ? (
    <nav aria-label={label} className={cn("font-mono text-[12.5px]", className)}>
      {list}
    </nav>
  ) : (
    <div role="group" aria-label={label} className={cn("font-mono text-[12.5px]", className)}>
      {list}
    </div>
  );
}

function Branch({ nodes, selected, hrefFor, depth, tone }: { nodes: Node[]; selected?: string; hrefFor?: (p: string) => string; depth: number; tone: "default" | "code" }) {
  const code = tone === "code";
  return (
    <ul className={cn(depth > 0 && cn("ml-[11px] border-l pl-1.5", code ? "border-code-border" : "border-border"))}>
      {nodes.map((n) => {
        const active = n.path === selected;
        return (
          <li key={n.path}>
            {n.children ? (
              <>
                <span className={cn("flex h-7 items-center gap-1.5 px-1.5", code ? "text-code-muted" : "text-muted-foreground")}>
                  <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden="true" />
                  <FolderOpen className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{n.name}</span>
                </span>
                <Branch nodes={n.children} selected={selected} hrefFor={hrefFor} depth={depth + 1} tone={tone} />
              </>
            ) : hrefFor ? (
              <Link
                href={hrefFor(n.path)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "relative flex h-7 items-center gap-1.5 rounded-md px-1.5 transition-colors duration-(--dur-2) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  "before:absolute before:-left-[7px] before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-accent before:opacity-0 before:transition-opacity",
                  active && "before:opacity-100",
                  code
                    ? active
                      ? "bg-white/[0.07] text-code-fg"
                      : "text-code-fg/70 hover:bg-white/[0.04] hover:text-code-fg"
                    : active
                      ? "bg-surface-3 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <FileGlyph name={n.name} tone={tone} className="ml-[18px]" />
                <span className="truncate">{n.name}</span>
              </Link>
            ) : (
              <span className={cn("flex h-7 items-center gap-1.5 px-1.5", code ? "text-code-fg/75" : "text-foreground/80")}>
                <FileGlyph name={n.name} tone={tone} className="ml-[18px]" />
                <span className="truncate">{n.name}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
