import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider, themeInitScript, type Theme } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { site } from "@/config/site";
import { MotionEffects } from "@/components/marketing/motion-effects";
import { NavProgress } from "@/components/marketing/nav-progress";
import { Toaster } from "@/components/ui/toast";

// Display face for headings, prices and big numerals: Mona Sans Variable (OFL, self-hosted from
// @fontsource-variable). The latin "standard" file carries both the weight (200–900) and width
// (75–125%) axes, so display utilities can set font-stretch. Exposed as --font-mona-sans; the
// design system reads it through --font-display (globals.css).
const monaSans = localFont({
  src: [{ path: "../../node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-standard-normal.woff2", weight: "200 900", style: "normal" }],
  variable: "--font-mona-sans",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
  declarations: [{ prop: "font-stretch", value: "75% 125%" }],
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
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#08090b" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const raw = store.get("codexa_theme")?.value;
  const theme: Theme = raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
  // Site motion preference (MotionToggle). "reduced" turns on calm mode everywhere, on top of the OS setting.
  // Same name as MOTION_COOKIE in @/lib/client/motion (that module holds client hooks, so it is not imported here).
  const motion = store.get("codexa_motion")?.value === "reduced" ? "reduced" : undefined;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-motion={motion}
      className={`${GeistSans.variable} ${GeistMono.variable} ${monaSans.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
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
