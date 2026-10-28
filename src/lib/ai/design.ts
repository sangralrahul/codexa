/**
 * Design guidance for the agent, so a one-line prompt produces something that looks designed for
 * its subject rather than the generic "AI site" (purple gradients, glass cards, emoji icons,
 * "Unlock the power of…" copy). Two parts:
 * - DESIGN_RULES: always-on craft rules for UI work (system prompt, build mode, UI frameworks).
 * - designDirection(prompt): a concrete palette, type pairing and mood picked from the subject of
 *   the request (deterministic), added to the first build request of a project. When the user
 *   names colours, fonts or a style themselves, their words win and no direction is added.
 */

export const DESIGN_RULES = `DESIGN STANDARD (for anything with a user interface):
The result must look like a real product designed by a professional for this specific subject, not like a generic AI-generated site.
- Colour: one neutral base (white/stone/zinc, or near-black) plus ONE accent from the design direction. Use the accent sparingly: primary buttons, links, key highlights. Text stays neutral (slate/zinc/stone 900 and 600).
- Never use purple, violet, indigo or fuchsia, purple-to-pink or blue-to-purple gradients, unless the user explicitly asks for those colours.
- No decorative gradient blobs, glowing orbs, gradient text, glassmorphism or neon shadows. Flat surfaces, 1px borders, soft shadows at most.
- Typography: at most two typefaces (the direction names them; load them from Google Fonts in index.html with display=swap). Clear hierarchy: one large headline, short subheading, readable 16px+ body, generous line height. Use font weight and size for emphasis, not colour.
- Layout: a consistent 4/8px spacing scale, a max content width (about 1120-1200px), real whitespace between sections, aligned grids. Mobile first and fully responsive.
- Content: write specific, believable copy for the subject (real product names, prices, menu items, opening hours, plans). No lorem ipsum, no "Unlock the power of", "Revolutionize", "Seamless", "Elevate", "Next-gen", "Supercharge". No emoji used as icons; use the icon library in package.json (lucide-react when present) or simple inline SVG.
- Imagery: no stock-photo hotlinks. Use solid colour blocks, simple illustrations or CSS shapes that fit the palette, with descriptive alt text.
- Components: realistic navigation, buttons with hover and focus states, form fields with labels, empty and loading states where data appears. Accessible contrast (WCAG AA) and visible keyboard focus.
- Finish: a proper footer, a favicon/title in index.html matching the brand name, and consistent border radius (pick one: 6, 8 or 12px) across the whole app.`;

type Direction = {
  id: string;
  label: string;
  match: RegExp;
  mood: string;
  palette: string;
  type: string;
};

const DIRECTIONS: Direction[] = [
  {
    id: "food",
    label: "Warm hospitality",
    match: /\b(caf[eé]|coffee|bakery|restaurant|food|menu|kitchen|recipe|pizza|bar|brew|tea|catering|chef|dining|grocery)\b/i,
    mood: "warm, inviting, crafted; generous imagery blocks and a clear menu or offer",
    palette: "background stone-50 (#fafaf9), text stone-900 (#1c1917), accent terracotta (#c2410c / Tailwind orange-700), secondary sage (#4d7c0f) used rarely",
    type: "headings 'Fraunces' (serif, 600), body 'Inter' (400/500)",
  },
  {
    id: "finance",
    label: "Trustworthy finance",
    match: /\b(bank|finance|fintech|invest|budget|accounting|invoice|payroll|tax|loan|crypto|wallet|insurance|expense)\b/i,
    mood: "calm, precise, trustworthy; tabular numbers, restrained colour, clear data hierarchy",
    palette: "background white, surfaces slate-50 (#f8fafc), text slate-900 (#0f172a), accent deep blue (#1d4ed8 / blue-700), positive emerald-600, negative red-600",
    type: "headings 'Inter Tight' (600), body 'Inter' (400/500) with tabular-nums for figures",
  },
  {
    id: "health",
    label: "Clean health",
    match: /\b(health|clinic|doctor|dental|medical|therapy|wellness|fitness|gym|yoga|nutrition|care|hospital|pharmacy|meditation)\b/i,
    mood: "clean, reassuring, human; soft surfaces and plenty of air",
    palette: "background white, surfaces #f0fdfa (teal-50), text slate-800 (#1e293b), accent teal-700 (#0f766e)",
    type: "headings 'Plus Jakarta Sans' (700), body 'Inter' (400)",
  },
  {
    id: "fashion",
    label: "Editorial",
    match: /\b(fashion|clothing|boutique|jewel|beauty|cosmetic|salon|photograph|art|gallery|magazine|wedding|interior|architect|design studio|portfolio)\b/i,
    mood: "editorial and refined; big type, high contrast, lots of whitespace, image-led",
    palette: "background #fbfaf8, text neutral-950 (#0a0a0a), accent a single muted tone: clay (#9a3412) or ink (#111827); black buttons",
    type: "headings 'Instrument Serif' or 'Playfair Display' (400-600), body 'Inter' (400)",
  },
  {
    id: "dev",
    label: "Developer tool",
    match: /\b(api|developer|devtool|cli|sdk|code|github|deploy|monitor|log|database|infra|cloud|server|terminal|webhook)\b/i,
    mood: "sharp and technical; monospace details, code blocks, dense but tidy",
    palette: "background white or zinc-950 for a dark product, text zinc-900 / zinc-100, accent emerald-500 (#10b981) or orange-500 (#f97316) for one highlight",
    type: "headings 'Geist' or 'Inter Tight' (600), body 'Inter', code 'JetBrains Mono'",
  },
  {
    id: "education",
    label: "Friendly learning",
    match: /\b(school|course|learn|education|tutor|kids|student|class|lesson|quiz|teacher|academy|university)\b/i,
    mood: "friendly and encouraging but grown-up; rounded shapes, clear progress",
    palette: "background white, surfaces amber-50 (#fffbeb), text slate-900, accent sky-700 (#0369a1), highlight amber-400 (#fbbf24) used rarely",
    type: "headings 'Nunito' (800) or 'Plus Jakarta Sans' (700), body 'Inter' (400)",
  },
  {
    id: "travel",
    label: "Outdoors & places",
    match: /\b(travel|hotel|tour|trip|booking|resort|real estate|property|rental|apartment|home|camp|hike|adventure|airbnb)\b/i,
    mood: "airy and aspirational; large image areas, calm earthy colour",
    palette: "background #fafaf7, text stone-900, accent forest green (#166534 / green-800), secondary sand (#d6c7a1)",
    type: "headings 'DM Serif Display' (400), body 'Inter' (400/500)",
  },
  {
    id: "commerce",
    label: "Modern retail",
    match: /\b(shop|store|ecommerce|e-commerce|product|cart|checkout|marketplace|sell|candle|shoe|furniture)\b/i,
    mood: "product-first and confident; clean grids, strong prices, clear add-to-cart",
    palette: "background white, surfaces neutral-50, text neutral-900, accent black buttons with a single warm accent (#b45309 / amber-700) for sale badges and links",
    type: "headings 'Manrope' (700), body 'Inter' (400/500)",
  },
  {
    id: "saas",
    label: "Calm SaaS",
    match: /\b(saas|startup|dashboard|analytics|crm|productivity|task|project management|team|admin|platform|tool|app)\b/i,
    mood: "crisp and calm, Linear/Stripe-grade restraint; neutral UI chrome, one confident accent",
    palette: "background white, surfaces zinc-50 (#fafafa), borders zinc-200, text zinc-900, accent blue-600 (#2563eb) or emerald-600 (#059669)",
    type: "headings 'Inter Tight' (600), body 'Inter' (400/500)",
  },
];

/** Neutral fallbacks, chosen by a stable hash so different projects do not all look alike. */
const FALLBACKS: Omit<Direction, "match">[] = [
  { id: "ink-emerald", label: "Ink & emerald", mood: "clean and modern with confident restraint", palette: "background white, text zinc-900, accent emerald-600 (#059669)", type: "headings 'Inter Tight' (600), body 'Inter'" },
  { id: "stone-amber", label: "Stone & amber", mood: "warm, approachable, well-made", palette: "background stone-50, text stone-900, accent amber-700 (#b45309)", type: "headings 'Manrope' (700), body 'Inter'" },
  { id: "slate-blue", label: "Slate & blue", mood: "trustworthy and precise", palette: "background white, text slate-900, accent blue-700 (#1d4ed8)", type: "headings 'Plus Jakarta Sans' (700), body 'Inter'" },
  { id: "paper-rust", label: "Paper & rust", mood: "editorial and characterful", palette: "background #fbfaf8, text neutral-900, accent rust (#c2410c)", type: "headings 'Fraunces' (600), body 'Inter'" },
  { id: "white-teal", label: "White & teal", mood: "fresh, calm and clear", palette: "background white, text slate-900, accent teal-700 (#0f766e)", type: "headings 'DM Sans' (700), body 'Inter'" },
];

/** True when the user already said how it should look (colours, fonts, a style or a reference). */
const USER_STYLE = /\b(colou?r|palette|theme|dark mode|light mode|font|typeface|style like|look like|inspired by|brand|purple|violet|indigo|pink|red|blue|green|orange|yellow|black|white|gradient|minimal|brutalist|retro|neon|pastel)\b/i;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type DesignDirection = { id: string; label: string; text: string } | null;

/**
 * A concrete design direction for the request, or null when the user specified the look.
 * `seed` (the project id) keeps the fallback stable for a project.
 */
export function designDirection(prompt: string, seed = ""): DesignDirection {
  if (USER_STYLE.test(prompt)) return null;
  const d = DIRECTIONS.find((x) => x.match.test(prompt)) ?? FALLBACKS[hash(seed || prompt) % FALLBACKS.length];
  return {
    id: d.id,
    label: d.label,
    text: `Design direction "${d.label}" (chosen for this subject; apply it unless the user later asks otherwise):\n- Mood: ${d.mood}\n- Palette: ${d.palette}\n- Typography: ${d.type}`,
  };
}

/** Frameworks that render a UI (the Express API starters do not). */
export function hasUi(framework: string) {
  return framework !== "node-express";
}
