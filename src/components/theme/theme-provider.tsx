"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { withViewTransition } from "@/lib/client/view-transition";

export type Theme = "light" | "dark" | "system";

type Ctx = { theme: Theme; resolved: "light" | "dark"; setTheme: (t: Theme) => void };
const ThemeContext = createContext<Ctx | null>(null);

function systemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t: Theme): "light" | "dark" {
  const r = t === "system" ? systemTheme() : t;
  document.documentElement.classList.toggle("dark", r === "dark");
  document.documentElement.style.colorScheme = r;
  return r;
}

export function ThemeProvider({ initialTheme, children }: { initialTheme: Theme; children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [resolved, setResolved] = useState<"light" | "dark">(initialTheme === "system" ? "light" : initialTheme);

  useEffect(() => {
    const apply = () => setResolved(applyTheme(theme));
    const id = requestAnimationFrame(apply);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => {
      cancelAnimationFrame(id);
      mq.removeEventListener("change", apply);
    };
  }, [theme]);

  // Switching theme crossfades the whole page (View Transitions; instant when calm or unsupported).
  const setTheme = useCallback((t: Theme) => {
    try {
      document.cookie = `codexa_theme=${t}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies blocked: the theme still applies for this visit */
    }
    withViewTransition(() => {
      setResolved(applyTheme(t));
      setThemeState(t);
    });
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Inline script that applies the theme class before hydration to avoid a flash. */
export const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|; )codexa_theme=(light|dark|system)/);var t=m?m[1]:'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
