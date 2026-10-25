import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { ContentSection, ContentSource, RawContentRecord } from "./types";
import bundled from "./content.generated.json";

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

type BundledContent = Partial<Record<ContentSection, { file: string; raw: string }[]>>;

/**
 * Content compiled into the server bundle at build time
 * (scripts/generate-content-bundle.ts). Used in production so hosts without
 * a filesystem (Cloudflare Workers) or without the repo files (serverless)
 * still serve docs, guides, blog, help and changelog.
 */
export class BundledContentSource implements ContentSource {
  constructor(private readonly data: BundledContent = bundled as BundledContent) {}

  async list(section: ContentSection): Promise<RawContentRecord[]> {
    return (this.data[section] ?? []).map((f) => ({ id: `${section}/${f.file}`, defaultSlug: f.file.replace(/\.md$/, ""), raw: f.raw }));
  }

  async get(section: ContentSection, slug: string): Promise<RawContentRecord | null> {
    if (!/^[a-z0-9-]+$/.test(slug)) return null;
    const all = await this.list(section);
    return (
      all.find((r) => r.defaultSlug === slug) ??
      all.find((r) => new RegExp(`^slug:\\s*["']?${slug}["']?\\s*$`, "m").test(r.raw.split("\n---")[0] ?? "")) ??
      null
    );
  }
}

let active: ContentSource | null = null;

/**
 * The content source in use: the filesystem in development (live editing),
 * the build-time bundle in production. Swap it with setContentSource() to use
 * a CMS or database.
 */
export function getContentSource(): ContentSource {
  if (!active) active = process.env.NODE_ENV === "production" ? new BundledContentSource() : new FilesystemContentSource();
  return active;
}

export function setContentSource(source: ContentSource | null) {
  active = source;
}
