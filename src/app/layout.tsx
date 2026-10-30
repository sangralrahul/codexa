import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import { DEFAULT_THEME, ThemeProvider, themeInitScript, type Theme } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { site } from "@/config/site";
import { MotionEffects } from "@/components/marketing/motion-effects";
import { NavProgress } from "@/components/marketing/nav-progress";
import { Toaster } from "@/components/ui/toast";

// Type: Inter Variable for UI and body copy (opsz axis, so large sizes get Inter Display's tighter
// shapes) and Inter Tight Variable for headings, prices and big numerals. Both OFL, self-hosted
// from @fontsource-variable. Exposed as --font-inter / --font-inter-tight; globals.css reads them
// through --font-sans and --font-display.
const inter = localFont({
  src: [{ path: "../../node_modules/@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});
const interTight = localFont({
  src: [{ path: "../../node_modules/@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter-tight",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
});
// Accent face: Instrument Serif italic (OFL), used only for the highlighted words of a page H1.
const instrumentSerif = localFont({
  src: [{ path: "../../node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" }],
  variable: "--font-instrument-serif",
  display: "swap",
  preload: true,
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { siteName: site.name, type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const raw = store.get("codexa_theme")?.value;
  const theme: Theme = raw === "light" || raw === "dark" || raw === "system" ? raw : DEFAULT_THEME;
  // Site motion preference (MotionToggle). "reduced" turns on calm mode everywhere, on top of the OS setting.
  // Same name as MOTION_COOKIE in @/lib/client/motion (that module holds client hooks, so it is not imported here).
  const motion = store.get("codexa_motion")?.value === "reduced" ? "reduced" : undefined;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-motion={motion}
      className={`${inter.variable} ${interTight.variable} ${instrumentSerif.variable} ${GeistMono.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Scroll-reveal styles only hide content once JS is known to run. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider initialTheme={theme}>
          <TooltipProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
            >
              Skip to content
            </a>
            <NavProgress />
            {children}
            <MotionEffects />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
