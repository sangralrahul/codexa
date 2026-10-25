import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { ContentSection, ContentSource, RawContentRecord } from "./types";

/**
 * Filesystem-backed content source. Reads content/<section>/*.md relative
 * to the repository root. Server only (uses node:fs).
 */
export class FilesystemContentSource implements ContentSource {
  constructor(private readonly root: string = path.join(process.cwd(), "content")) {}

  private dir(section: ContentSection) {
    return path.join(this.root, section);
  }

  async list(section: ContentSection): Promise<RawContentRecord[]> {
    const dir = this.dir(section);
    if (!fs.existsSync(dir)) return [];
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
      .sort();
    return files.map((file) => ({
      id: path.join(section, file),
      defaultSlug: file.replace(/\.md$/, ""),
      raw: fs.readFileSync(path.join(dir, file), "utf8"),
    }));
  }

  async get(section: ContentSection, slug: string): Promise<RawContentRecord | null> {
    // Fast path: file named after the slug. Fall back to scanning for a
    // frontmatter slug override.
    if (!/^[a-z0-9-]+$/.test(slug)) return null;
    const direct = path.join(this.dir(section), `${slug}.md`);
    if (fs.existsSync(direct)) {
      return { id: path.join(section, `${slug}.md`), defaultSlug: slug, raw: fs.readFileSync(direct, "utf8") };
    }
    const all = await this.list(section);
    return all.find((r) => new RegExp(`^slug:\\s*["']?${slug}["']?\\s*$`, "m").test(r.raw.split("\n---")[0] ?? "")) ?? null;
  }
}

let active: ContentSource | null = null;

/** The content source in use. Swap it with setContentSource() to use a CMS/database. */
export function getContentSource(): ContentSource {
  if (!active) active = new FilesystemContentSource();
  return active;
}

export function setContentSource(source: ContentSource | null) {
  active = source;
}
