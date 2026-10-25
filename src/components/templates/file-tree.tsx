import Link from "next/link";
import { File, Folder } from "lucide-react";
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

/** Server-rendered file tree; selecting a file is a link (?file=...) so no client JS is needed. */
export function FileTree({ paths, selected, hrefFor, className }: { paths: string[]; selected: string; hrefFor: (path: string) => string; className?: string }) {
  const tree = buildTree(paths);
  return (
    <nav aria-label="Template files" className={cn("text-sm", className)}>
      <Branch nodes={tree} selected={selected} hrefFor={hrefFor} depth={0} />
    </nav>
  );
}

function Branch({ nodes, selected, hrefFor, depth }: { nodes: Node[]; selected: string; hrefFor: (p: string) => string; depth: number }) {
  return (
    <ul className={cn(depth > 0 && "ml-3 border-l border-border pl-2")}>
      {nodes.map((n) => (
        <li key={n.path}>
          {n.children ? (
            <>
              <span className="flex items-center gap-1.5 py-1 text-muted-foreground">
                <Folder className="size-3.5 shrink-0" aria-hidden="true" />
                {n.name}
              </span>
              <Branch nodes={n.children} selected={selected} hrefFor={hrefFor} depth={depth + 1} />
            </>
          ) : (
            <Link
              href={hrefFor(n.path)}
              scroll={false}
              aria-current={n.path === selected ? "true" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
                n.path === selected ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              <File className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{n.name}</span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
