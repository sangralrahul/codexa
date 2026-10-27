/**
 * Idea passport (PLAN §4.1): the sentence typed on a marketing page travels
 * through signup and onboarding to the dashboard/IDE.
 *
 * - The URL carries it as `?prompt=` (and `&template=`), built by ideaHref().
 * - A copy is stashed in localStorage under PENDING_IDEA_KEY for 24 hours,
 *   so the hand-off survives OAuth round trips and new tabs.
 * - This is separate from `codexa:initialPrompt` (sessionStorage, read by the
 *   IDE chat panel), which stays as it is.
 *
 * Every storage access is wrapped in try/catch (private mode, blocked storage).
 */
export const IDEA_MAX = 2000;
export const PENDING_IDEA_KEY = "codexa:pendingIdea";
const TTL_MS = 24 * 60 * 60 * 1000;

export type IdeaSource = "home" | "cta" | "solution" | "command";
export type PendingIdea = { text: string; source: IdeaSource; templateId?: string; at: number };

const SOURCES: readonly IdeaSource[] = ["home", "cta", "solution", "command"];

/** Trims and caps an idea at IDEA_MAX characters (line breaks inside are kept). */
export function clampIdea(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).replace(/\r\n?/g, "\n").trim().slice(0, IDEA_MAX);
}

/** Stores the idea for the next 24 hours. Returns the stored record, or null when storage is unavailable or the text is empty. */
export function stashPendingIdea(text: string, source: IdeaSource, templateId?: string): PendingIdea | null {
  const clean = clampIdea(text);
  if (!clean) return null;
  const record: PendingIdea = { text: clean, source, ...(templateId ? { templateId } : {}), at: Date.now() };
  try {
    window.localStorage.setItem(PENDING_IDEA_KEY, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

/** The stashed idea if it exists, is well formed and is under 24 hours old; otherwise null (expired records are removed). */
export function readPendingIdea(): PendingIdea | null {
  try {
    const raw = window.localStorage.getItem(PENDING_IDEA_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<PendingIdea> | null;
    const valid =
      v &&
      typeof v.text === "string" &&
      v.text.trim().length > 0 &&
      typeof v.at === "number" &&
      SOURCES.includes(v.source as IdeaSource) &&
      (v.templateId === undefined || typeof v.templateId === "string");
    if (!valid || Date.now() - (v.at as number) > TTL_MS || (v.at as number) > Date.now() + 60_000) {
      window.localStorage.removeItem(PENDING_IDEA_KEY);
      return null;
    }
    return { text: clampIdea(v.text), source: v.source as IdeaSource, ...(v.templateId ? { templateId: v.templateId } : {}), at: v.at as number };
  } catch {
    return null;
  }
}

export function clearPendingIdea() {
  try {
    window.localStorage.removeItem(PENDING_IDEA_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** `/signup?prompt=…[&template=id]` or `/dashboard?prompt=…[&template=id]`. Safe on the server. */
export function ideaHref(base: "/signup" | "/dashboard", text: string, templateId?: string): string {
  const params = new URLSearchParams();
  const clean = clampIdea(text);
  if (clean) params.set("prompt", clean);
  if (templateId) params.set("template", templateId);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
