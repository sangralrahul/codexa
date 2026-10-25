---
title: Add dark mode to a Vite app
description: A short Build-mode task with clear acceptance criteria, then a hand-made tweak and a deployment.
category: Frontend
order: 3
tags: [react, tailwind, dark-mode, build-mode]
author: Codexa Team
date: 2026-10-24
difficulty: beginner
duration: 20 min
related: [fix-a-failing-build-with-fix-mode]
---

A small feature with acceptance criteria shows how to get predictable results from Build mode.

## 1. The prompt

```text
Add dark mode:
- a toggle button in the header with an accessible label
- Tailwind "class" strategy; add the `dark` class on <html>
- respect prefers-color-scheme on first load, then remember the choice
  in localStorage
- no new dependencies
Done when `npm run build` passes and both themes render without unstyled flashes.
```

## 2. What to expect

The plan should mention `tailwind.config` (or the Tailwind v4 CSS variant the template uses), the header component and a tiny script that applies the stored theme before React renders. The validating stage runs the build.

## 3. Check it in the preview

Run the preview, toggle, reload. If the page flashes light before going dark, the theme script runs too late; ask in Fix mode with that sentence as the error description.

## 4. Adjust by hand

Open the component and change the icon or colours. Save; the preview updates.

## 5. Deploy

Deploy to Codexa hosting and test the live URL on a phone. Rollback is available if a later change regresses it.
