import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { cookies } from "next/headers";
import "./globals.css";
import { DEFAULT_THEME, ThemeProvider, themeInitScript, type Theme } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { site } from "@/config/site";
import { MotionEffects } from "@/components/marketing/motion-effects";
import { NavProgress } from "@/components/marketing/nav-progress";
import { Toaster } from "@/components/ui/toast";

// Type: Geist Sans for UI, body and headings, Geist Mono for code, labels and numerals (both OFL,
// self-hosted by the geist package). They set --font-geist-sans / --font-geist-mono on <html>;
// globals.css reads them through --font-sans, --font-display and --font-mono.

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
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
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
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
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
