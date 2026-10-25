import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseContent } from "@/lib/content/markdown";
import { frontmatterSchema, CONTENT_SECTIONS } from "@/lib/content/types";
import { FilesystemContentSource } from "@/lib/content/source";
import { PUBLIC_ROUTES } from "@/config/routes";

const valid = `---
title: Hello
description: A test page
category: Start here
tags: [a, b]
author: Codexa Team
date: 2026-10-24
related: [other]
---

# Hello

Body text.
`;

describe("frontmatter validation", () => {
  it("parses a valid document and applies defaults", () => {
    const { frontmatter, body } = parseContent(valid, "docs/hello.md");
    expect(frontmatter.title).toBe("Hello");
    expect(frontmatter.draft).toBe(false);
    expect(frontmatter.related).toEqual(["other"]);
    expect(body.startsWith("# Hello")).toBe(true);
  });

  it("normalises YAML dates parsed as Date objects to YYYY-MM-DD", () => {
    const { frontmatter } = parseContent(valid.replace("date: 2026-10-24", "date: 2026-01-05"), "x");
    expect(frontmatter.date).toBe("2026-01-05");
  });

  it("rejects a missing title, naming the record", () => {
    expect(() => parseContent(valid.replace("title: Hello\n", ""), "docs/broken.md")).toThrow(/docs\/broken\.md.*title/);
  });

  it("rejects unknown keys and bad slugs", () => {
    expect(() => parseContent(valid.replace("tags:", "tagz:"), "x")).toThrow(/tagz/);
    expect(() => parseContent(valid.replace("category: Start here", "category: Start here\nslug: Not Kebab"), "x")).toThrow(/slug/);
  });

  it("only accepts the team author", () => {
    expect(frontmatterSchema.safeParse({ title: "t", description: "d", category: "c", date: "2026-10-24", author: "Someone Else" }).success).toBe(false);
  });
});

describe("content tree", () => {
  const source = new FilesystemContentSource();

  it("every file parses and slugs are unique per section", async () => {
    for (const section of CONTENT_SECTIONS) {
      const records = await source.list(section);
      expect(records.length, `content/${section} should not be empty`).toBeGreaterThan(0);
      const slugs = new Set<string>();
      for (const r of records) {
        const { frontmatter } = parseContent(r.raw, r.id);
        const slug = frontmatter.slug ?? r.defaultSlug;
        expect(slugs.has(slug), `duplicate slug ${slug} in ${section}`).toBe(false);
        slugs.add(slug);
      }
    }
  });

  it("every related slug resolves somewhere in the tree", async () => {
    const all = new Set<string>();
    const related: { id: string; slug: string }[] = [];
    for (const section of CONTENT_SECTIONS) {
      for (const r of await source.list(section)) {
        const { frontmatter } = parseContent(r.raw, r.id);
        all.add(frontmatter.slug ?? r.defaultSlug);
        for (const slug of frontmatter.related) related.push({ id: r.id, slug });
      }
    }
    for (const { id, slug } of related) expect(all.has(slug), `${id} relates to missing slug ${slug}`).toBe(true);
  });

  it("covers every docs and guides slug in the route manifest", async () => {
    const docs = new Set((await source.list("docs")).map((r) => r.defaultSlug));
    const guides = new Set((await source.list("guides")).map((r) => r.defaultSlug));
    for (const r of PUBLIC_ROUTES) {
      if (r.path.startsWith("/docs/")) expect(docs.has(r.path.slice("/docs/".length)), r.path).toBe(true);
      if (r.path.startsWith("/guides/")) expect(guides.has(r.path.slice("/guides/".length)), r.path).toBe(true);
    }
  });
});
