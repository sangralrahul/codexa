import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, File, Folder, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveShareToken } from "@/lib/services/share-links";
import { listFiles, readFile } from "@/lib/services/projects";
import { buildTree, type TreeNode } from "@/lib/client/workspace/paths";
import { CodeView } from "@/components/editor/code-view";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";
import { frameworkLabel } from "@/components/projects/format";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ path?: string }> };

export const metadata: Metadata = { title: "Shared project", robots: { index: false, follow: false } };

/**
 * Public read-only view of a project behind a share link. The token is resolved against its
 * hash; revoked, expired and deleted-project links 404. Nothing here is interactive, so the
 * page is a pure server component (navigation is via ?path= links).
 */
export default async function SharePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { path } = await searchParams;
  const resolved = await resolveShareToken(token);
  if (!resolved) notFound();
  const { project, link } = resolved;
  const files = await listFiles(project.id);
  const current = path && files.some((f) => f.path === path) ? path : (pickDefault(files.map((f) => f.path)) ?? null);
  const file = current ? await readFile(project.id, current) : null;
  const tree = buildTree(files);
  const href = (p: string) => `/share/${encodeURIComponent(token)}?path=${encodeURIComponent(p)}`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo withText={false} />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{project.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {frameworkLabel(project.framework)} · {files.length} files · shared read-only
              {link.expiresAt ? ` · expires ${link.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Lock className="size-3" aria-hidden="true" /> View only
          </Badge>
          <Link href="/signup" className="hidden text-xs font-medium text-primary hover:underline sm:inline">
            Build your own with Codexa
          </Link>
        </div>
      </header>
      {project.description ? <p className="border-b border-border bg-surface px-4 py-2 text-sm text-muted-foreground">{project.description}</p> : null}
      <div className="grid flex-1 grid-cols-1 md:grid-cols-[260px_1fr]">
        <nav aria-label="Files" className="max-h-64 overflow-auto border-b border-border bg-surface py-2 md:max-h-none md:border-b-0 md:border-r">
          {tree.length === 0 ? <p className="px-4 py-6 text-center text-xs text-muted-foreground">This project has no files.</p> : <Tree nodes={tree} depth={0} current={current} href={href} />}
        </nav>
        <main className="min-w-0 p-4">
          {file ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate font-mono">{file.path}</span>
                <span>{formatBytes(file.size)}</span>
              </div>
              {file.isBinary ? <p className="text-sm text-muted-foreground">Binary file; preview is not available.</p> : <CodeView content={file.content} className="max-h-[calc(100vh-10rem)]" />}
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Select a file to view its contents.</p>
          )}
        </main>
      </div>
    </div>
  );
}

function pickDefault(paths: string[]) {
  const preferred = ["README.md", "src/App.tsx", "src/main.tsx", "index.html", "src/index.ts", "package.json"];
  return preferred.find((p) => paths.includes(p)) ?? paths[0];
}

function Tree({ nodes, depth, current, href }: { nodes: TreeNode[]; depth: number; current: string | null; href: (p: string) => string }) {
  return (
    <ul role={depth === 0 ? "tree" : "group"}>
      {nodes.map((n) => (
        <li key={n.path} role="treeitem" aria-expanded={n.type === "folder" ? true : undefined} aria-selected={n.path === current}>
          {n.type === "folder" ? (
            <>
              <div className="flex items-center gap-1.5 py-1 text-[13px] text-muted-foreground" style={{ paddingLeft: depth * 12 + 12 }}>
                <ChevronRight className="size-3.5 rotate-90" aria-hidden="true" />
                <Folder className="size-4" aria-hidden="true" />
                <span className="truncate">{n.name}</span>
              </div>
              <Tree nodes={n.children} depth={depth + 1} current={current} href={href} />
            </>
          ) : (
            <Link
              href={href(n.path)}
              aria-current={n.path === current ? "page" : undefined}
              className={cn("flex items-center gap-1.5 py-1 pr-2 text-[13px] hover:bg-muted", n.path === current ? "bg-primary/10 text-foreground" : "text-foreground/90")}
              style={{ paddingLeft: depth * 12 + 30 }}
            >
              <File className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">{n.name}</span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
