import { z } from "zod";

/** Sections that live as markdown files under content/<section>/. */
export const CONTENT_SECTIONS = ["docs", "guides", "tutorials", "blog", "help", "changelog"] as const;
export type ContentSection = (typeof CONTENT_SECTIONS)[number];

export const SECTION_BASE_PATH: Record<ContentSection, string> = {
  docs: "/docs",
  guides: "/guides",
  tutorials: "/tutorials",
  blog: "/blog",
  help: "/help",
  changelog: "/changelog",
};

export const SECTION_LABEL: Record<ContentSection, string> = {
  docs: "Documentation",
  guides: "Guides",
  tutorials: "Tutorials",
  blog: "Blog",
  help: "Help center",
  changelog: "Changelog",
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "date must be a valid date");

const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case");

/**
 * Frontmatter accepted on every content file. Unknown keys are rejected so
 * typos surface at build time instead of silently disappearing.
 */
export const frontmatterSchema = z
  .object({
    title: z.string().min(1).max(160),
    description: z.string().min(1).max(320),
    slug: slug.optional(),
    category: z.string().min(1).max(80),
    order: z.number().int().min(0).optional(),
    tags: z.array(z.string().min(1).max(40)).max(12).default([]),
    author: z.literal("Codexa Team").default("Codexa Team"),
    date: isoDate,
    updated: isoDate.optional(),
    related: z.array(slug).max(8).default([]),
    /** Changelog only: semantic version for the release the entry belongs to. */
    version: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/)
      .optional(),
    /** Tutorials/guides: rough difficulty label shown in listings. */
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    /** Tutorials/guides: estimated time to complete, e.g. "20 min". */
    duration: z.string().max(20).optional(),
    /** Set to true to keep a file out of listings, search and sitemaps. */
    draft: z.boolean().default(false),
  })
  .strict();

export type Frontmatter = z.infer<typeof frontmatterSchema>;
export type FrontmatterInput = z.input<typeof frontmatterSchema>;

export type Heading = { depth: 2 | 3; text: string; id: string };

export type ContentDoc = Frontmatter & {
  section: ContentSection;
  /** Final slug (frontmatter slug or the file name without extension). */
  slug: string;
  /** Public URL path, e.g. /docs/ai-agent. */
  href: string;
  /** Markdown body without frontmatter. */
  body: string;
  /** Plain-text version of the body used for search snippets. */
  plain: string;
  readingTime: { minutes: number; words: number; text: string };
  headings: Heading[];
  /** Source identifier (file path for the filesystem source). */
  sourceId: string;
};

/** Listing-safe projection (no body) for navigation and index pages. */
export type ContentSummary = Omit<ContentDoc, "body" | "plain" | "headings">;

/**
 * Abstraction over where content comes from. The default implementation
 * reads markdown files from disk; a database- or CMS-backed implementation
 * only has to return the same raw records. See content/README.md.
 */
export interface ContentSource {
  /** Return every raw record in a section (frontmatter is parsed later). */
  list(section: ContentSection): Promise<RawContentRecord[]>;
  /** Return a single raw record by section and slug, or null. */
  get(section: ContentSection, slug: string): Promise<RawContentRecord | null>;
}

export type RawContentRecord = {
  /** Stable id for the record (file path, row id, CMS entry id). */
  id: string;
  /** Default slug derived from the id when frontmatter has no slug. */
  defaultSlug: string;
  /** Full markdown document including a YAML frontmatter block. */
  raw: string;
};
