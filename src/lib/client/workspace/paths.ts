/** Pure path helpers shared by the file explorer, quick-open and the share page (no browser APIs). */

export type TreeNode =
  | { type: "file"; name: string; path: string; size: number }
  | { type: "folder"; name: string; path: string; children: TreeNode[] };

export function basename(path: string) {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

export function dirname(path: string) {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

export function joinPath(dir: string, name: string) {
  return dir ? `${dir}/${name}` : name;
}

export function extensionOf(path: string) {
  const name = basename(path);
  const i = name.lastIndexOf(".");
  return i <= 0 ? "" : name.slice(i + 1).toLowerCase();
}

/** Folders first, then files; both alphabetical and case-insensitive. */
function sortNodes(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  for (const n of nodes) if (n.type === "folder") sortNodes(n.children);
  return nodes;
}

/** Build a tree from flat file paths plus optional empty folders (folders are implicit in the storage model). */
export function buildTree(files: { path: string; size?: number }[], extraFolders: string[] = []): TreeNode[] {
  const root: TreeNode[] = [];
  const folders = new Map<string, TreeNode & { type: "folder" }>();

  const ensureFolder = (path: string): TreeNode[] => {
    if (!path) return root;
    const existing = folders.get(path);
    if (existing) return existing.children;
    const parentChildren = ensureFolder(dirname(path));
    const node: TreeNode & { type: "folder" } = { type: "folder", name: basename(path), path, children: [] };
    folders.set(path, node);
    parentChildren.push(node);
    return node.children;
  };

  for (const f of extraFolders) ensureFolder(f);
  for (const f of files) {
    const siblings = ensureFolder(dirname(f.path));
    siblings.push({ type: "file", name: basename(f.path), path: f.path, size: f.size ?? 0 });
  }
  return sortNodes(root);
}

/** Simple subsequence fuzzy match with a score favouring prefix/basename matches. Returns -1 when no match. */
export function fuzzyScore(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (!q) return 0;
  const idx = c.indexOf(q);
  if (idx !== -1) {
    const base = basename(c);
    const inBase = base.includes(q);
    return 1000 - idx + (inBase ? 200 : 0) + (base.startsWith(q) ? 300 : 0) - c.length / 10;
  }
  let qi = 0;
  let score = 0;
  let last = -1;
  for (let i = 0; i < c.length && qi < q.length; i++) {
    if (c[i] === q[qi]) {
      score += last === i - 1 ? 15 : 5;
      if (i === 0 || c[i - 1] === "/" || c[i - 1] === "." || c[i - 1] === "-" || c[i - 1] === "_") score += 10;
      last = i;
      qi++;
    }
  }
  return qi === q.length ? score - c.length / 10 : -1;
}

/** Validate a user-typed path segment for a new file/folder name. */
export function validateName(name: string): string | null {
  const n = name.trim();
  if (!n) return "Name is required";
  if (n === "." || n === "..") return "Invalid name";
  if (/[\0<>:"|?*\\]/.test(n)) return "Name contains invalid characters";
  if (n.length > 200) return "Name is too long";
  return null;
}
