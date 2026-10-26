# Codexa design system ("LIVE BUILD")

The reference for tokens, type, surfaces, motion and the shared components. Hex values live only in
`src/app/globals.css`; components use tokens. Dark is the house theme; light is "paper". Every surface
must work in both themes, at 390px and 1440px, and in **calm** mode.

## 1. Non-negotiables

- **Honesty.** No fabricated customers, logos-as-customers, testimonials, usage numbers, uptime or speed
  claims. Numbers on marketing pages come from code (`TEMPLATES`, `PLANS`, `toolSchemas`, `LIMITS`, …).
  Every product depiction carries an `IllustrationBadge` ("Illustration" / "Scripted replay · not a
  recording") and invented data is labelled "Sample data". Live/deployed states only after the server
  confirms them. Brand marks only for integrations users can really connect.
- **Accessibility.** One `<h1>` per page; visible focus; hover affordances mirrored on `:focus-visible`;
  anything that moves for more than 5s has a `PauseButton`; decorative visuals are `aria-hidden`.
- **Performance.** Animate `transform`, `opacity`, `clip-path`. At most one live WebGL canvas per page
  (`<Horizon>` / `<Backdrop>` live) and none inside `(app)`. Loops stop off-screen and in hidden tabs.

## 2. Tokens

All existing names are kept; ★ = new. Tailwind colours map 1:1 (`bg-surface-3`, `text-foreground-dim`, …).

| Token | Use |
|---|---|
| `--background` `--foreground` | Page ink/paper |
| ★`--foreground-dim` | `.text-dim` two-tone qualifier (≥4.8:1 both themes) |
| `--surface` `--surface-2` ★`--surface-3` | Quiet fills; `surface-3` = pressed/active rows |
| `--card` `--card-foreground` `--muted` `--muted-foreground` | Cards, muted fills and text |
| `--border` `--border-strong` `--input` `--ring` | Lines, inputs, focus |
| `--primary` `--primary-hover` `--primary-foreground` | Monochrome primary (ink on paper / paper on ink) |
| `--signal` (ember) ★`--signal-2` (amber) | Rims, progress, the ember CTA. Large text/icons only on paper |
| ★`--signal-ink` | The **only** signal colour for text under 24px (`text-signal-ink`) |
| `--accent` | AI "thinking" and plan states only |
| `--success` (★`--live` alias) `--warning` `--danger` `--info` | Status |
| `--code-bg` `--code-fg` ★`--code-border` ★`--code-muted` | Code panes (dark in both themes) |
| ★`--syn-keyword/-string/-fn/-tag/-number/-comment/-attr/-type` | Syntax colours (`text-syn-*`); `.hljs-*` read them |
| `--selection` ★`--selection-strong` | Selection, `.mark-select` |
| `--hairline` ★`--grid-line` `--glass` | Inner highlights, grids, glass |
| `--silk-0..3` `--silk-opacity` | Horizon / backdrop light (area tones remap 1–3) |
| `--shadow-sm/md/lg` ★`--shadow-xl` ★`--shadow-stage` | `shadow-*` utilities |
| Composite: ★`--ember` ★`--rim` ★`--glow-signal` ★`--keylight` | Gradients and glows |
| Motion: `--ease-out` `--ease-in-out` `--ease-in` `--ease-snap` `--ease-spring`; `--dur-1..6` (90/160/240/420/720/1100ms) | `ease-*` utilities; `duration-(--dur-3)` |
| Radius: `--radius: .75rem` → `rounded-sm 8 · md 10 · lg 12 · xl 16 · 2xl 18` | Controls 10, cards 16, windows 18, menus 14 |
| `--font-display` (Mona Sans, wght 200–900, wdth 75–125) | `font-display`; Geist Sans UI; Geist Mono code/kickers |

**Area tones** (marketing): put `data-tone="product|trust|docs|pricing|company"` on any element inside
`<main>`; `body:has(main [data-tone=…])` re-tints `--silk-1..3` so the site backdrop takes the area's light.

## 3. Type

| Class | Use |
|---|---|
| `text-display-1` | Home H1 only (max 14ch; width axis 100→104→112%) |
| `text-display-2` | Inner-page H1, chapter openers, final CTA |
| `text-display-3` | Section h2, stage captions, prices |
| `text-display-4` | Marketing h3, bento/principle card titles |
| `text-title` | Small card titles (Geist 600) |
| `text-lead` | Lead paragraph (muted, 58ch) |
| `text-label` | Mono uppercase kicker: "01 — DESCRIBE", table heads |
| `text-meta` | 12px tabular meta |
| `text-app-display` / `text-app-title` | Dashboard greeting / app page h1 |
| `text-dim` | Two-tone qualifier inside a display heading (≤ once per heading) |
| `mark-select` | Selection mark: **once per page, H1 only** |
| `link-draw` | Text link whose underline draws on hover/focus |

> **tailwind-merge gotcha.** `cn()` (tailwind-merge) treats unknown `text-*` classes (`text-display-*`,
> `text-title`, `text-lead`, `text-label`, `text-meta`, `text-app-*`, `text-dim`) as **text colours**: in one
> `cn()` call, a later `text-foreground` / `text-muted-foreground` drops them (and vice versa). Put type
> utilities in a plain string outside `cn()`: ``className={`text-label ${cn("text-muted-foreground", x)}`}``.

## 4. Surfaces and lighting

| Class | Recipe / use |
|---|---|
| `e1` | Card: `bg-card`, border, inner hairline, `shadow-sm` |
| `e2` | Hover/popover/menu: `border-strong`, `shadow-lg` |
| `e3` | e2 + rim — prompt composer, plan cards |
| `e4` | Window: 18px radius, `shadow-stage`, rim at 70% |
| `rim` | 1px ember light on the top edge (`::before`; don't combine with another `::before`) |
| `keylight` / `app-atmosphere` | Static app lighting (no WebGL). `app-atmosphere` adds a masked dot grid (+ grain in dark); uses `::before/::after` |
| `bg-blueprint` / `bg-dots` | 64px grid / 22px dots, radially masked — use on an empty `absolute inset-0` layer. `bg-dots` lights up under the nearest `[data-spotlight]` |
| `horizon-line` | 1px ember→cobalt line with bloom; ends hero sections |
| `site-backdrop` | Top-of-page wash for inner marketing pages (`<Backdrop variant="wash" still className="site-backdrop" />` inside `.site-shell`); hidden when the page has `data-page="home"` |
| `btn-ember` | Ember gradient CTA (`Button variant="ember"`): ≤1 per viewport, ≤2 per page |
| `glass` | Header capsule, sticky bars, menus, floating cards only |
| `comet-border` (> `.comet-border__inner`) | Comet travels only while `[data-active]` / `:focus-within` and on-screen |

## 5. Motion

Rules: exits run at ~70% of the enter with `--ease-in`; app feedback ≤240ms (≤420ms except Launch and
real outcomes); motion shows state changing; ≤1 ambient loop per viewport; never blocks input.

**Calm** = OS reduced motion **or** `<html data-motion="reduced">` (cookie `codexa_motion`, set by
`MotionToggle`). Tailwind: `calm:` variant; CSS: `@variant calm { … }`; JS: `useCalm()` / `isCalm()`.
Calm shows final frames: no pinning, no WebGL (CSS poster), no tilt, spark, magnet or ripple; static
marquees; instant reveals; complete typed text. A global backstop finishes every CSS animation instantly.

| Attribute / class | Behaviour |
|---|---|
| `data-reveal` | Rise in (20px, blur 4px, 720ms) once 10% visible. `--reveal-delay` offsets it |
| `data-reveal="stagger"` | Children rise 60ms apart (8 max) |
| `data-spotlight` | Pointer light + border ring (`--mx/--my`). `data-spotlight="grid"` shares one light across children marked `data-spotlight-tile` (or `.glow-card`) |
| `data-spark` | Eight ember strokes + icon nudge on activation (mark the icon `data-spark-icon`, else the last child svg) |
| `data-magnetic` | Drifts ≤6px toward a fine pointer |
| `img[data-develop]` | Develops once loaded (blur/saturate → sharp); 1.6s failsafe |
| `data-no-ripple` | Opt out of the click ripple (buttons/menu rows ripple by default) |
| `data-onscreen-watch` | MotionEffects toggles `data-onscreen` while near the viewport |
| `scroll-tilt` / `scroll-fade` | Hero focus pull (page-top scroll 0→60svh); `--p` fallback |
| `scroll-scale` | .94→1 as the element enters |
| `shot-pan` | Wrap an `<img class="object-cover object-top">`: slow pan on hover/focus (`data-pan` forces it) |
| `develop` / `wipe-in` | Develop on mount / top-to-bottom assemble with a rim scanline |
| `stage-swap` (+`data-leaving`) | Caption swap in 240ms / out 168ms; re-key to replay |
| `shake` / `shake-sm` | Error shake (use `shakeElement(el)`) |
| `check-draw` | Draws `pathLength="1"` paths (or a lucide Check) |
| `live-dot` | 6px live dot with an expanding ring — only for things really live |
| `glide-indicator` (`--bar`) | The sliding pill/bar of `useGlide` |
| `text-shimmer` | Shimmering stage label while an agent works |
| `marquee` > `marquee__track` | Drift; clones get `data-marquee-clone`; `data-reverse`, `data-paused`, `--marquee-duration` |
| `materialize`, `materialize__icon`, `materialize__sweep` | New file rows (M10) |
| `diff-row[data-collapsed]`, `diff-sweep` | Diff wipe (M9) |
| `code-line-in` | Streamed code line (M7) |
| Radix overlays: `cx-overlay` `cx-dialog` `cx-sheet` `cx-pop` (`cx-pop--quick`) `cx-menu` | Enter/exit keyframes on `data-state` |

## 6. Components

- `@/components/ui`: Button (variants incl. `ember`, `soft`; `xl`; `spark`, `magnetic`; `state` with
  locked width; `appearance="app"` = 10px radius, or set `--btn-radius` on an ancestor), Field (auto
  `aria-describedby`/`aria-invalid`), Input, Textarea (`autoGrow`), Select (native), SelectMenu (Radix; id
  on the trigger), Avatar + `initialsOf`, Popover, Sheet, Switch, Segmented (radiogroup + glide), Meter,
  Kbd (`mod`), StatusDot (`pulse`), LiveDot, Tabs (`pill` / `underline`), EmptyState (`illustrated`),
  Alert (`live={false}` → role=note), Dialog, DropdownMenu, Tooltip, toast.
- `@/components/motion`: SplitHeading, ScrollScene/useScene/scrollToStep, useAutoplay/PauseButton,
  useTimeline/useTypewriter, Odometer, useGlide/GlideIndicator, LaunchSequence/useLaunch, MotionToggle.
- `@/components/frames`: AppWindow, BrowserFrame, DeviceFrame, IllustrationBadge, FrameCaption.
- `@/components/vignettes`: StepRow, CodeLines, tokenize, FileRow, AgentRun, DiffRestore, TerminalStream,
  DeployHistory, SqlRunner, EditorPeek, ViewportMorph, CommitList, EnvVars, PresenceCursors, `VIGNETTES`.
- `@/components/brand`: BrandMark (simple-icons, CC0; monogram fallback), `BRAND_IDS`, `hasBrandMark`.
  Regenerate with `node scripts/extract-brand-marks.mjs`. Show with "Trademarks belong to their owners;
  no partnership implied."
- `@/components/marketing/backdrop`: Backdrop (`wash` | `horizon`), Horizon, Eyebrow (`href`),
  Highlight (`.text-dim`), PageTitle (`highlight`, `mark`). `autoHighlight` is deprecated (returns undefined).
- `@/components/marketing/section`: Section (`tone` incl. `band`, `size`), SectionHeader (`index`, `size`, `lead`).
- `@/lib/client/*`: motion (`isCalm`, `useCalm`, `MOTION_COOKIE`, `setMotionPreference`, `shakeElement`),
  platform (`usePlatformMod`, `isMac`), pending-idea (idea passport), view-transition (`withViewTransition`).
- `LogoMark state="idle|running|success|error"`.

Server/client: SplitHeading, frames (except IllustrationBadge), StepRow, CodeLines, FileRow, tokenize,
Avatar, Meter, misc UI and the `VIGNETTES` registry are server-safe. `@/lib/client/motion` and `platform`
contain hooks: import them from client components only. Vignettes render their **final frame** on the
server and until they first play; they size to their container (`w-full`, inline-size contained).

## 7. Do / don't

| Do | Don't |
|---|---|
| One ember CTA per viewport | Ember as gradient text or a large fill; blue-purple gradients |
| `text-dim` on the qualifier a writer chose | Mechanical accents on every title |
| `IllustrationBadge` + "Sample data" on depictions | Present a starter screenshot as "what the AI made" |
| Real counts imported from code, footnoted | Hard-coded "16 templates", %, uptime, speed |
| Pause control for loops >5s; final frame when calm | Scroll hijacking, mandatory snap, scrubbed un-builds |
| `.app-atmosphere` / `.keylight` in the app | `Backdrop`/Silk/WebGL or colour bands in `(app)` |
| Lucide icons inline with titles | Icon-in-a-box tiles in marketing lists; hand-drawn logos |
