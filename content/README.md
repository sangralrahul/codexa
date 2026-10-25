# Content

Markdown content for the public site lives here, one folder per section:

| Folder        | URL prefix     | Ordering                     |
| ------------- | -------------- | ---------------------------- |
| `docs/`       | `/docs/`       | `order`, then title          |
| `guides/`     | `/guides/`     | `order`, then title          |
| `tutorials/`  | `/tutorials/`  | `order`, then title          |
| `blog/`       | `/blog/`       | newest `date` first          |
| `help/`       | `/help/`       | `order`, then title          |
| `changelog/`  | `/changelog/`  | newest `date`, then `order`  |

Files starting with `_` are ignored. The slug defaults to the file name
(`ai-agent.md` → `/docs/ai-agent`) and can be overridden with `slug:`.

## Frontmatter

Validated with zod in `src/lib/content/types.ts` (`frontmatterSchema`). Unknown
keys fail the build on purpose.

```yaml
---
title: AI agent                 # required, ≤160 chars
description: How the agent …    # required, ≤320 chars (used for SEO + listings)
slug: ai-agent                  # optional, lowercase kebab-case
category: Build                 # required; groups the sidebar / listings
order: 12                       # optional; lower sorts first
tags: [ai, agent]               # optional, ≤12
author: Codexa Team             # only value accepted today
date: 2026-10-24                # YYYY-MM-DD
updated: 2026-10-24             # optional
related: [prompting, projects]  # slugs, looked up in the same section first
version: 0.1.0                  # changelog only
difficulty: beginner            # guides/tutorials only
duration: 20 min                # guides/tutorials only
draft: false                    # true hides from listings, search and sitemap
---
```

Reading time, headings (for the table of contents) and a plain-text body (for
search snippets) are computed by the loader; do not put them in frontmatter.

## Callouts

A blockquote whose first paragraph starts with `Note:`, `Tip:`, `Warning:`,
`Caution:` or `Review:` renders as a callout. `Review:` is the marker for text
that needs legal or security sign-off before publication.

## Loader

`src/lib/content/index.ts` exposes `getDoc(section, slug)`, `listDocs()`,
`getBySection()`, `getNavigation()`, `getAdjacent()` and `getRelated()`. In
production the parsed sections are cached in module scope; in development
every request re-reads the files so edits show up on refresh.

## Swapping the source (CMS / database)

The loader never touches the filesystem directly. It reads through the
`ContentSource` interface (`src/lib/content/types.ts`):

```ts
interface ContentSource {
  list(section: ContentSection): Promise<RawContentRecord[]>;
  get(section: ContentSection, slug: string): Promise<RawContentRecord | null>;
}
```

A record is `{ id, defaultSlug, raw }` where `raw` is the full markdown
document including its frontmatter block. To serve content from a database
or CMS, implement the interface and register it once at startup:

```ts
import { setContentSource } from "@/lib/content/source";
setContentSource(new MyCmsContentSource());
```

Everything downstream (validation, reading time, search index, pages) keeps
working unchanged because it only ever sees raw records.
