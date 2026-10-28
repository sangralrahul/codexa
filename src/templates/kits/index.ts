/**
 * Factories for the gallery templates. Each template is one of three kits (real React source in
 * templates-src/kits, bundled into ./files.generated.ts by scripts/build-template-kits.mjs) plus its
 * own data file (src/site.ts, src/dashboard.ts or src/app.ts), theme (src/index.css) and fonts.
 * Every word, colour and number a template shows lives in its data file, so users (and the agent)
 * edit one obvious file to make it theirs.
 */
import type { Template, TemplateCategory, TemplateDifficulty } from "../types";
import { VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";
import { KIT_FILES } from "./files.generated";
import type { Site } from "../../../templates-src/kits/site/src/types";
import type { Dashboard } from "../../../templates-src/kits/dashboard/src/types";
import type { AppSpec } from "../../../templates-src/kits/app/src/types";

export type { Site, Dashboard, AppSpec };

type Palette = { bg: string; surface: string; fg: string; muted: string; line: string; accent: string; accentFg: string; dark?: boolean };

/** Hand-tuned palettes: one neutral base plus one accent each. No purple, by design. */
export const PALETTES = {
  terracotta: { bg: "#faf8f5", surface: "#f3efe9", fg: "#1c1917", muted: "#6b635b", line: "#e7e1d8", accent: "#c2410c", accentFg: "#ffffff" },
  forest: { bg: "#fafaf7", surface: "#f1f2ec", fg: "#14211a", muted: "#5d6b62", line: "#e2e5dc", accent: "#166534", accentFg: "#ffffff" },
  ocean: { bg: "#ffffff", surface: "#f6f8fb", fg: "#0f172a", muted: "#5b6576", line: "#e3e8ef", accent: "#1d4ed8", accentFg: "#ffffff" },
  teal: { bg: "#ffffff", surface: "#f3faf9", fg: "#0f1f1e", muted: "#56706d", line: "#dde9e7", accent: "#0f766e", accentFg: "#ffffff" },
  ink: { bg: "#ffffff", surface: "#f6f6f5", fg: "#111111", muted: "#6b6b6b", line: "#e6e6e4", accent: "#111111", accentFg: "#ffffff" },
  clay: { bg: "#fbfaf8", surface: "#f3f1ed", fg: "#0a0a0a", muted: "#6e6a64", line: "#e5e1da", accent: "#9a3412", accentFg: "#ffffff" },
  amber: { bg: "#fffdf8", surface: "#faf5ea", fg: "#1f1a12", muted: "#6f6656", line: "#ece4d3", accent: "#b45309", accentFg: "#ffffff" },
  rose: { bg: "#fffafa", surface: "#fbf1f1", fg: "#241517", muted: "#765f62", line: "#efdfe0", accent: "#be123c", accentFg: "#ffffff" },
  emerald: { bg: "#ffffff", surface: "#f5faf7", fg: "#0b1f17", muted: "#587064", line: "#e0ebe5", accent: "#047857", accentFg: "#ffffff" },
  sky: { bg: "#ffffff", surface: "#f4f9fc", fg: "#0c1a26", muted: "#577082", line: "#deeaf2", accent: "#0369a1", accentFg: "#ffffff" },
  olive: { bg: "#f9f8f3", surface: "#f0eee4", fg: "#22241a", muted: "#66685a", line: "#e2dfd2", accent: "#4d7c0f", accentFg: "#ffffff" },
  coral: { bg: "#ffffff", surface: "#fff6f1", fg: "#1d1410", muted: "#725f55", line: "#f1e2d9", accent: "#c2410c", accentFg: "#ffffff" },
  signal: { bg: "#ffffff", surface: "#f7f7f8", fg: "#18181b", muted: "#63636b", line: "#e6e6e9", accent: "#dc2626", accentFg: "#ffffff" },
  mustard: { bg: "#fdfcf7", surface: "#f6f2e3", fg: "#1e1c14", muted: "#6b6650", line: "#e9e3cc", accent: "#a16207", accentFg: "#ffffff" },
  pine: { bg: "#f8f5ee", surface: "#efe9dc", fg: "#1d2a24", muted: "#5f6a63", line: "#e0d8c6", accent: "#2f5d50", accentFg: "#ffffff" },
  cobalt: { bg: "#ffffff", surface: "#f5f7fa", fg: "#0a0f1c", muted: "#5c6475", line: "#e2e6ee", accent: "#2563eb", accentFg: "#ffffff" },
  nightEmerald: { bg: "#0b0c0d", surface: "#131517", fg: "#ececec", muted: "#9a9fa5", line: "#24272b", accent: "#34d399", accentFg: "#052e1f", dark: true },
  nightAmber: { bg: "#0c0b0a", surface: "#161412", fg: "#f1ede8", muted: "#a39b91", line: "#2a2622", accent: "#f59e0b", accentFg: "#1c1204", dark: true },
  nightSky: { bg: "#0a0d12", surface: "#11161d", fg: "#e8edf3", muted: "#93a0b0", line: "#222a35", accent: "#38bdf8", accentFg: "#04202e", dark: true },
  nightLime: { bg: "#0a0a0a", surface: "#141414", fg: "#ededed", muted: "#a1a1a1", line: "#262626", accent: "#a3e635", accentFg: "#1a2e05", dark: true },
  nightOrange: { bg: "#0d0b0a", surface: "#171312", fg: "#f2eeeb", muted: "#a59c96", line: "#2b2522", accent: "#fb923c", accentFg: "#2a1205", dark: true },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;

/** Google Fonts used by the gallery; every one ships weights 400-700. */
const FONTS = {
  Inter: "sans-serif",
  "Inter Tight": "sans-serif",
  Manrope: "sans-serif",
  "Plus Jakarta Sans": "sans-serif",
  "DM Sans": "sans-serif",
  "Space Grotesk": "sans-serif",
  "Bricolage Grotesque": "sans-serif",
  Sora: "sans-serif",
  Outfit: "sans-serif",
  Figtree: "sans-serif",
  "Schibsted Grotesk": "sans-serif",
  "Instrument Sans": "sans-serif",
  Archivo: "sans-serif",
  "IBM Plex Sans": "sans-serif",
  Nunito: "sans-serif",
  Syne: "sans-serif",
  Fraunces: "serif",
  "Playfair Display": "serif",
  Newsreader: "serif",
  Lora: "serif",
  "Cormorant Garamond": "serif",
  "EB Garamond": "serif",
  "Source Serif 4": "serif",
  "JetBrains Mono": "monospace",
  "IBM Plex Mono": "monospace",
} as const;

export type FontName = keyof typeof FONTS;

export type ThemeSpec = { palette: PaletteName; heading: FontName; body?: FontName; radius?: number };

export type Meta = {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  category: TemplateCategory;
  tags: string[];
  difficulty?: TemplateDifficulty;
  featured?: boolean;
};

const stack = (f: FontName) =>
  `"${f}", ${FONTS[f] === "serif" ? 'ui-serif, Georgia, "Times New Roman", serif' : FONTS[f] === "monospace" ? "ui-monospace, SFMono-Regular, Menlo, monospace" : 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'}`;

function indexCss(t: ThemeSpec) {
  const p: Palette = PALETTES[t.palette];
  const body = t.body ?? "Inter";
  const status = p.dark ? { good: "#34d399", warn: "#fbbf24", bad: "#f87171" } : { good: "#047857", warn: "#b45309", bad: "#b91c1c" };
  return `@import "tailwindcss";

/* Theme: change these to restyle the whole site. */
@theme {
  --color-bg: ${p.bg};
  --color-surface: ${p.surface};
  --color-fg: ${p.fg};
  --color-muted: ${p.muted};
  --color-line: ${p.line};
  --color-accent: ${p.accent};
  --color-accent-fg: ${p.accentFg};
  --color-good: ${status.good};
  --color-warn: ${status.warn};
  --color-bad: ${status.bad};
  --font-heading: ${stack(t.heading)};
  --font-body: ${stack(body)};
  --radius-card: ${t.radius ?? 10}px;
}

html {
  color-scheme: ${p.dark ? "dark" : "light"};
  scroll-behavior: smooth;
  background: var(--color-bg);
}

body {
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

::selection {
  background: color-mix(in srgb, var(--color-accent) 22%, transparent);
}
`;
}

function indexHtml(title: string, description: string, t: ThemeSpec) {
  const fonts = Array.from(new Set([t.heading, t.body ?? "Inter"]));
  const families = fonts.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700`).join("&");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description.replace(/"/g, "&quot;")}" />
    <meta name="theme-color" content="${PALETTES[t.palette].bg}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&display=swap" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

type Kit = "site" | "dashboard" | "app";

const KIT_INFO: Record<Kit, { file: string; type: string; name: string; what: string }> = {
  site: { file: "src/site.ts", type: "Site", name: "site", what: "every headline, section, price and link" },
  dashboard: { file: "src/dashboard.ts", type: "Dashboard", name: "dashboard", what: "every metric, chart series and table row" },
  app: { file: "src/app.ts", type: "AppSpec", name: "app", what: "the record fields, statuses and sample data" },
};

function build(kit: Kit, meta: Meta, theme: ThemeSpec, title: string, data: unknown): Template {
  const info = KIT_INFO[kit];
  const readme = `# ${meta.name}

${meta.longDescription}

## Make it yours

- **Content:** \`${info.file}\` holds ${info.what}. Edit it (or ask Codexa) and the page updates.
- **Look:** \`src/index.css\` holds the colours, fonts and corner radius; fonts load from Google Fonts in \`index.html\`.
- **Layout:** the components in \`src/\` are plain React + Tailwind CSS. Change them freely.

\`\`\`bash
npm install
npm run dev
\`\`\`
`;
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    longDescription: meta.longDescription,
    category: meta.category,
    tags: meta.tags,
    framework: "vite-react",
    dependencies: VITE_DEPS,
    settings: VITE_SETTINGS,
    prebuilt: true,
    difficulty: meta.difficulty ?? (kit === "site" ? "beginner" : "intermediate"),
    featured: meta.featured,
    previewPath: "/",
    files: {
      ...viteBase({ name: `codexa-${meta.id}`, title, readme }),
      ...KIT_FILES[kit],
      "index.html": indexHtml(title, meta.description, theme),
      "src/index.css": indexCss(theme),
      [info.file]: `import type { ${info.type} } from "./types";\n\n/** Everything this ${kit === "site" ? "site" : kit === "dashboard" ? "dashboard" : "app"} shows. Edit freely. */\nexport const ${info.name}: ${info.type} = ${JSON.stringify(data, null, 2)};\n`,
    },
  };
}

export function siteTemplate(meta: Meta, theme: ThemeSpec, site: Site): Template {
  return build("site", meta, theme, site.brand, site);
}

export function dashboardTemplate(meta: Meta, theme: ThemeSpec, dashboard: Dashboard): Template {
  return build("dashboard", meta, theme, `${dashboard.title} · ${dashboard.brand}`, dashboard);
}

export function appTemplate(meta: Meta, theme: ThemeSpec, spec: AppSpec): Template {
  return build("app", meta, theme, `${spec.title} · ${spec.brand}`, spec);
}
