---
title: Public website
description: Marketing pages, documentation, learning center, help center, changelog, roadmap and site-wide search built from a markdown content system.
category: Release
order: 8
version: 0.1.0
tags: [release, website, docs, search]
author: Codexa Team
date: 2026-10-24
related: [billing-and-teams]
---

## Content system

- Markdown with validated frontmatter under `content/` for docs, guides, tutorials, blog, help and changelog, loaded through a swappable `ContentSource` interface.
- Reading time, headings for the table of contents and related articles computed at load time.

## Pages

- Documentation with sidebar, breadcrumbs, previous/next, table of contents, "edit on GitHub" and last-updated dates.
- Developer pages: API overview, reference generated from a hand-maintained registry and verified against the route files on disk, authentication, projects, generations, deployments and webhooks. SDK and CLI pages state that neither is available yet.
- Learning center: blog, guides, tutorials, glossary, webinars (none recorded yet) and newsletter.
- Help center, FAQ, changelog and roadmap.

## Search

- A MiniSearch index over docs, guides, tutorials, blog, help, changelog, glossary and templates served from `GET /api/v1/search`, with a Cmd/Ctrl+K dialog, category filters, keyboard navigation and recent searches.

Documentation: [Developers](/developers).
