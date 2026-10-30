export type ThemeMode = "system" | "light" | "dark";
const KEY = "codexa:theme";

/** Dark is the default (an editor-first tool); people can switch to light or follow Windows in Settings. */
export const getThemeMode = (): ThemeMode => (localStorage.getItem(KEY) as ThemeMode | null) ?? "dark";

/** Applies the theme to the page and the native title bar buttons. */
export async function applyTheme(mode: ThemeMode = getThemeMode()) {
  localStorage.setItem(KEY, mode);
  const resolved = await window.codexa.setTheme(mode);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  window.dispatchEvent(new CustomEvent("codexa:theme", { detail: resolved }));
}

export const isDark = () => document.documentElement.classList.contains("dark");
