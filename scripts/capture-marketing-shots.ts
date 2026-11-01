/**
 * Captures the website's product screenshots (public/marketing) from a running Codexa dev server,
 * in both themes: `<name>.webp` (dark) and `<name>-light.webp` (light), same crop and pixel size.
 *
 *   CAPTURE_EMAIL=… CAPTURE_PASSWORD=… npx tsx scripts/capture-marketing-shots.ts
 *   … --theme light                      # one theme only
 *   … --only editor,agent                # some shots only
 *   … --dry /tmp/look                    # write PNG + WebP to a folder; public/ untouched
 *   … --state /tmp/codexa-state.json     # reuse one sign-in across runs (keep it outside the repo)
 *
 * The workspace shots are best taken with the runner stopped (the header then shows a neutral "Run"
 * rather than a preview that is still starting); the publish shot needs the runner, or the dialog
 * reports Codexa hosting as unreachable.
 *
 * Needs: the web app at CAPTURE_URL (default http://localhost:3005) started with AI_MOCK=1 (the
 * agent shots send one real chat message and freeze the page mid-run with the debugger), and an
 * account whose workspace has a project named CAPTURE_PROJECT (default "Candle store"). The dev-only
 * chrome (Next.js dev badge, "Mock AI" chips) is hidden, since it never appears in production.
 * Everything else is the app as it renders. Preinstalled Playwright Chromium (never `playwright install`).
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const ROOT = process.cwd();
const BASE = process.env.CAPTURE_URL ?? "http://localhost:3005";
const EMAIL = process.env.CAPTURE_EMAIL;
const PASSWORD = process.env.CAPTURE_PASSWORD;
const PROJECT = process.env.CAPTURE_PROJECT ?? "Candle store";
const PROMPT_NEW = "An online store for handmade candles with categories, search and a cart";
const PROMPT_AGENT = "Add a wishlist button to each product card and a wishlist count in the header";
const SCALE = 2;
const QUALITY = 82;

const args = process.argv.slice(2);
const argOf = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = argOf("--only") ? new Set(argOf("--only")!.split(",").map((s) => s.trim())) : null;
const themes = (argOf("--theme") ? [argOf("--theme")!] : ["light", "dark"]) as Theme[];
const dryDir = argOf("--dry") ? path.resolve(argOf("--dry")!) : null;
const statePath = argOf("--state") ? path.resolve(argOf("--state")!) : null;
const OUT_DIR = dryDir ?? path.join(ROOT, "public", "marketing");

type Theme = "light" | "dark";
type Box = { x: number; y: number; width: number; height: number };
/** One output: a crop (CSS px; omitted = the whole viewport) resized to width × height. */
type Out = { name: string; width: number; height: number; crop?: Box };
type Scene = { id: string; viewport: { width: number; height: number }; outs: string[]; run: (page: Page, ctx: BrowserContext) => Promise<{ png: Buffer; crops: Record<string, Box | undefined> }> };

const DESKTOP = { width: 1440, height: 900 };
/** The demo frames are 1280 × 732 (7:4); 1440 × 824 is the same shape. */
const DEMO = { width: 1440, height: 824 };

const SIZES: Record<string, { width: number; height: number }> = {
  "app-dashboard": { width: 1280, height: 800 },
  "app-settings": { width: 1280, height: 800 },
  "app-composer": { width: 896, height: 560 },
  "app-editor": { width: 1048, height: 655 },
  "app-agent": { width: 720, height: 450 },
  "app-history": { width: 680, height: 425 },
  "app-publish": { width: 880, height: 550 },
  "demo-describe": { width: 1280, height: 732 },
  "demo-agent": { width: 1280, height: 732 },
  "demo-history": { width: 1280, height: 732 },
  "demo-publish": { width: 1280, height: 732 },
};

function log(msg: string) {
  console.log(`[marketing] ${msg}`);
}

/** Dev-only chrome that production never shows. */
const HIDE_DEV_CSS = `nextjs-portal{display:none!important}[title^="AI_MOCK=1"]{display:none!important}`;

async function bbox(page: Page, selector: string): Promise<Box> {
  const b = await page.locator(selector).first().boundingBox();
  if (!b) throw new Error(`no box for ${selector}`);
  return b;
}

async function settle(page: Page, ms = 1200) {
  await page.addStyleTag({ content: HIDE_DEV_CSS }).catch(() => {});
  // Blur the focused control so no focus ring or caret is caught mid-blink.
  await page.waitForTimeout(ms);
}

async function shoot(page: Page) {
  await page.mouse.move(DESKTOP.width - 2, DESKTOP.height - 2);
  return page.screenshot({ type: "png", animations: "disabled", caret: "hide" });
}

async function projectHref(page: Page): Promise<string> {
  await page.goto(`${BASE}/projects`, { waitUntil: "networkidle", timeout: 180_000 });
  const href = await page.locator('a[href^="/projects/"]', { hasText: PROJECT }).first().getAttribute("href");
  if (!href) throw new Error(`project "${PROJECT}" not found`);
  return href;
}

async function openWorkspace(page: Page, href: string, file = "src/Cart.tsx") {
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle", timeout: 180_000 });
  await page.getByRole("radio", { name: "Code" }).click();
  await page.locator(`[role=treeitem][data-path="${file}"]`).click();
  await page.locator(".monaco-editor").first().waitFor();
  await settle(page, 1500);
}

/** The Publish dialog after its pre-publish scan, with the passed checks listed. */
async function openPublish(page: Page) {
  await openWorkspace(page, href);
  await page.getByRole("button", { name: /^Publish/ }).first().click();
  await page.getByText("Pre-publish checks").first().waitFor();
  await page.getByText("Scanning your code").waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
  // Open the list of checks that passed, so the picture shows what was verified.
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /checks? passed/ })
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await settle(page, 1500);
  return bbox(page, '[role="dialog"]');
}

async function openNewProject(page: Page) {
  await page.goto(`${BASE}/new-project`, { waitUntil: "networkidle", timeout: 180_000 });
  const box = page.locator("textarea").first();
  await box.fill(PROMPT_NEW);
  await box.blur();
  await settle(page, 1500);
}

let href = "";

const SCENES: Scene[] = [
  {
    id: "editor",
    viewport: DESKTOP,
    outs: ["app-editor"],
    async run(page) {
      await openWorkspace(page, href);
      const ex = await bbox(page, '[data-testid="file-explorer"]');
      const png = await shoot(page);
      // The code card: explorer at the left edge, Cart.tsx in the editor (16:10).
      return { png, crops: { "app-editor": { x: Math.round(ex.x) - 1, y: Math.round(ex.y) - 41, width: 1040, height: 650 } } };
    },
  },
  {
    id: "agent",
    viewport: DEMO,
    outs: ["app-agent", "demo-agent"],
    async run(page, ctx) {
      await openWorkspace(page, href);
      await page.getByRole("button", { name: "New chat" }).click();
      await page.waitForTimeout(600);
      await page.locator("textarea").first().fill(PROMPT_AGENT);
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Debugger.enable");
      let paused = false;
      cdp.on("Debugger.paused", () => (paused = true));
      // Freeze the page (debugger statement) once both files are being written.
      await page.evaluate(() => {
        const mo = new MutationObserver(() => {
          const s = document.querySelector('section[aria-label="Writing files"]');
          const t = s?.textContent ?? "";
          if (t.includes("Feature.tsx") && t.includes("App.tsx")) {
            mo.disconnect();
            // Let the frame paint, then stop.
            requestAnimationFrame(() =>
              setTimeout(() => {
                // eslint-disable-next-line no-debugger
                debugger;
              }, 0),
            );
          }
        });
        mo.observe(document.body, { childList: true, subtree: true, characterData: true });
      });
      await page.addStyleTag({ content: HIDE_DEV_CSS });
      await page.mouse.move(DEMO.width - 2, DEMO.height - 2);
      await page.keyboard.press("Enter");
      const t0 = Date.now();
      while (!paused && Date.now() - t0 < 90_000) await new Promise((r) => setTimeout(r, 25));
      if (!paused) throw new Error("agent run never reached 'Writing files'");
      const shot = (await cdp.send("Page.captureScreenshot", { format: "png" })) as { data: string };
      log(`agent frozen after ${Date.now() - t0} ms`);
      await cdp.send("Debugger.resume");
      await cdp.send("Debugger.disable");
      // Let the run finish so the next scene starts from a quiet workspace.
      await page.waitForTimeout(6000);
      return { png: Buffer.from(shot.data, "base64"), crops: { "app-agent": { x: 0, y: 49, width: 720, height: 450 }, "demo-agent": undefined } };
    },
  },
  {
    id: "history",
    viewport: DEMO,
    outs: ["app-history", "demo-history"],
    async run(page) {
      await openWorkspace(page, href);
      await page.getByRole("button", { name: /^History/ }).click();
      await page.locator('ol[aria-label="Version history"]').waitFor();
      await settle(page, 1800);
      const dlg = await bbox(page, '[role="dialog"]');
      const png = await shoot(page);
      // The drawer's top, with a strip of the dimmed workspace to its left.
      const crop: Box = { x: Math.round(dlg.x + dlg.width) - 680 + 8, y: Math.round(dlg.y) - 8, width: 680, height: 425 };
      return { png, crops: { "app-history": { ...crop, x: Math.max(0, Math.min(crop.x, DEMO.width - 680)), y: Math.max(0, crop.y) }, "demo-history": undefined } };
    },
  },
  {
    id: "publish",
    viewport: DESKTOP,
    outs: ["app-publish"],
    async run(page) {
      const dlg = await openPublish(page);
      const png = await shoot(page);
      // The dialog's top two thirds with a margin of dimmed workspace above and on both sides.
      return { png, crops: { "app-publish": { x: Math.round(dlg.x + dlg.width / 2 - 440), y: Math.max(0, Math.round(dlg.y) - 44), width: 880, height: 550 } } };
    },
  },
  {
    id: "publish-demo",
    viewport: DEMO,
    outs: ["demo-publish"],
    async run(page) {
      await openPublish(page);
      return { png: await shoot(page), crops: { "demo-publish": undefined } };
    },
  },
  {
    id: "new-project",
    viewport: DESKTOP,
    outs: ["app-composer"],
    async run(page) {
      await openNewProject(page);
      const tabs = await bbox(page, '[role="tablist"], [role="radiogroup"]');
      const png = await shoot(page);
      // From the mode tabs down: the composer with its prompt, the starters and the first templates.
      const crop = { x: Math.round(tabs.x) - 2, y: Math.round(tabs.y) - 2, width: 896, height: 560 };
      crop.y = Math.min(crop.y, DESKTOP.height - crop.height);
      return { png, crops: { "app-composer": crop } };
    },
  },
  {
    id: "describe",
    viewport: DEMO,
    outs: ["demo-describe"],
    async run(page) {
      await openNewProject(page);
      return { png: await shoot(page), crops: { "demo-describe": undefined } };
    },
  },
  {
    id: "settings",
    viewport: DESKTOP,
    outs: ["app-settings"],
    async run(page) {
      await page.goto(`${BASE}/settings`, { waitUntil: "networkidle", timeout: 180_000 });
      await settle(page, 2000);
      return { png: await shoot(page), crops: { "app-settings": undefined } };
    },
  },
  {
    id: "dashboard",
    viewport: DESKTOP,
    outs: ["app-dashboard"],
    async run(page) {
      await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle", timeout: 180_000 });
      // From the composer down: the prompt box, "jump back in", the projects table and the usage meters.
      const heading = page.getByRole("heading", { name: "Projects", exact: true }).first();
      await heading.waitFor();
      await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, ((await heading.boundingBox())?.y ?? 0) - 440));
      await settle(page, 2500);
      return { png: await shoot(page), crops: { "app-dashboard": undefined } };
    },
  },
];

/** Signs in once (or reuses `--state <file>`, so repeated runs do not pile up sessions). */
async function signIn(browser: Browser) {
  const saved = statePath && existsSync(statePath) ? statePath : undefined;
  const ctx = await browser.newContext({ viewport: DESKTOP, storageState: saved });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  if (page.url().includes("/login")) {
    if (!EMAIL || !PASSWORD) throw new Error("Set CAPTURE_EMAIL and CAPTURE_PASSWORD (an account with the demo projects).");
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 180_000 });
  }
  href = await projectHref(page);
  const state = await ctx.storageState();
  if (statePath) writeFileSync(statePath, JSON.stringify(state));
  await ctx.close();
  return state;
}

async function encode(png: Buffer, crop: Box | undefined, name: string, theme: Theme, vpWidth: number) {
  const size = SIZES[name];
  let img = sharp(png);
  // Device pixels per CSS pixel, read from the capture itself.
  const k = ((await img.metadata()).width ?? vpWidth * SCALE) / vpWidth;
  if (crop) img = img.extract({ left: Math.round(crop.x * k), top: Math.round(crop.y * k), width: Math.round(crop.width * k), height: Math.round(crop.height * k) });
  const resized = await img.resize(size.width, size.height, { fit: "cover", position: "top" }).png().toBuffer();
  const file = `${name}${theme === "light" ? "-light" : ""}.webp`;
  // Keep each capture near the size of the dark original (≤ 1.5×): step the quality down if needed.
  let budget = Infinity;
  try {
    budget = statSync(path.join(ROOT, "public", "marketing", `${name}.webp`)).size * 1.5;
  } catch {}
  let q = QUALITY;
  let webp = await sharp(resized).webp({ quality: q, effort: 6 }).toBuffer();
  while (webp.length > budget && q > 60) {
    q -= 4;
    webp = await sharp(resized).webp({ quality: q, effort: 6 }).toBuffer();
  }
  writeFileSync(path.join(OUT_DIR, file), webp);
  if (dryDir) writeFileSync(path.join(OUT_DIR, file.replace(/\.webp$/, ".png")), resized);
  log(`${file} ${size.width}×${size.height} q${q} ${(webp.length / 1024).toFixed(1)} KB`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    const state = await signIn(browser);
    log(`signed in; project ${href}`);
    for (const scene of SCENES) {
      if (only && !scene.outs.some((o) => only.has(o)) && !only.has(scene.id)) continue;
      for (const theme of themes) {
        const ctx = await browser.newContext({ viewport: scene.viewport, deviceScaleFactor: SCALE, storageState: state, colorScheme: theme });
        await ctx.addCookies([{ name: "codexa_theme", value: theme, url: BASE }]);
        const page = await ctx.newPage();
        page.setDefaultTimeout(60_000);
        try {
          const { png, crops } = await scene.run(page, ctx);
          for (const name of scene.outs) if (!only || only.has(name) || only.has(scene.id)) await encode(png, crops[name], name, theme, scene.viewport.width);
        } catch (err) {
          log(`FAILED ${scene.id} (${theme}): ${err instanceof Error ? err.message : String(err)}`);
          if (dryDir) await page.screenshot({ path: path.join(OUT_DIR, `failed-${scene.id}-${theme}.png`) }).catch(() => {});
        } finally {
          await ctx.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
