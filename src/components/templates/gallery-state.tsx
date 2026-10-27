"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { withViewTransition } from "@/lib/client/view-transition";
import type { TemplateCategory } from "@/templates";
import type { TemplateCardData } from "./types";
import { filterTemplateCards, galleryQuery, isDefaultView, type GalleryFilterState } from "./gallery-search";

export type { GalleryFilterState };

type GalleryContextValue = {
  state: GalleryFilterState;
  items: TemplateCardData[];
  results: TemplateCardData[];
  /** The unfiltered view: Featured row + grid. */
  showFeatured: boolean;
  /** A path-mode category change is loading its page. */
  pending: boolean;
  categoryMode: "path" | "query";
  basePath: string;
  navigate: (next: Partial<GalleryFilterState>) => void;
  reset: () => void;
  /** In-app preview sheet (query mode): the open template id. */
  preview: string | null;
  openPreview: (id: string | null) => void;
};

const GalleryContext = React.createContext<GalleryContextValue | null>(null);

export function useGallery() {
  const ctx = React.useContext(GalleryContext);
  if (!ctx) throw new Error("useGallery must be used inside <GalleryProvider>");
  return ctx;
}

/** Same as useGallery() but null outside a provider (for components that also render standalone). */
export function useMaybeGallery() {
  return React.useContext(GalleryContext);
}

const NAV_FLAG = "tplNav";

/**
 * Client state for the templates gallery. Filters apply instantly on the client (a twin of
 * searchTemplates() over card summaries) inside a View Transition, so tiles morph to their new
 * places; the URL is kept in sync with history.replaceState (q, framework, sort and, in query mode,
 * category). In path mode a category change navigates to `${basePath}/${category}` so the page
 * header follows. The server renders the same results from the URL, so reloads match.
 */
export function GalleryProvider({
  initial,
  items,
  categoryMode,
  basePath,
  initialPreview = null,
  children,
}: {
  initial: GalleryFilterState;
  items: TemplateCardData[];
  categoryMode: "path" | "query";
  basePath: string;
  initialPreview?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? basePath;
  const [pending, startTransition] = React.useTransition();
  const [state, setState] = React.useState<GalleryFilterState>(initial);
  const [preview, setPreview] = React.useState<string | null>(initialPreview);

  // Re-sync when the server renders a different URL state (back/forward, a path-mode category page).
  const initialKey = `${initial.q}|${initial.category}|${initial.framework}|${initial.sort}`;
  const [syncedKey, setSyncedKey] = React.useState(initialKey);
  if (initialKey !== syncedKey) {
    setSyncedKey(initialKey);
    setState(initial);
  }

  // A path-mode category navigation remounts the gallery; the flag stops cached screenshots from
  // "developing" a second time right after the morph. Cleared once the new page is in place.
  React.useEffect(() => {
    const root = document.documentElement;
    if (root.dataset[NAV_FLAG] === undefined) return;
    const id = window.setTimeout(() => delete root.dataset[NAV_FLAG], 900);
    return () => window.clearTimeout(id);
  }, []);

  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  });
  const previewRef = React.useRef(preview);
  React.useEffect(() => {
    previewRef.current = preview;
  });

  const writeUrl = React.useCallback(
    (s: GalleryFilterState, previewId: string | null, path: string) => {
      const keep = new URLSearchParams(window.location.search);
      if (previewId) keep.set("preview", previewId);
      else keep.delete("preview");
      const qs = galleryQuery(s, categoryMode, keep);
      window.history.replaceState(null, "", qs ? `${path}?${qs}` : path);
    },
    [categoryMode],
  );

  const navigate = React.useCallback(
    (next: Partial<GalleryFilterState>) => {
      const prev = stateRef.current;
      const merged: GalleryFilterState = { ...prev, ...next };
      if (merged.q === prev.q && merged.category === prev.category && merged.framework === prev.framework && merged.sort === prev.sort) return;
      withViewTransition(() => setState(merged));
      if (categoryMode === "path" && merged.category !== prev.category) {
        const path = merged.category === "all" ? basePath : `${basePath}/${merged.category}`;
        const qs = galleryQuery(merged, "path");
        document.documentElement.dataset[NAV_FLAG] = "";
        startTransition(() => router.replace(qs ? `${path}?${qs}` : path, { scroll: false }));
      } else {
        writeUrl(merged, previewRef.current, pathname);
      }
    },
    [basePath, categoryMode, pathname, router, writeUrl],
  );

  const reset = React.useCallback(() => navigate({ q: "", category: "all" as TemplateCategory | "all", framework: "all", sort: "featured" }), [navigate]);

  const openPreview = React.useCallback(
    (id: string | null) => {
      setPreview(id);
      writeUrl(stateRef.current, id, pathname);
    },
    [pathname, writeUrl],
  );

  const results = React.useMemo(() => filterTemplateCards(items, state), [items, state]);
  const value = React.useMemo<GalleryContextValue>(
    () => ({ state, items, results, showFeatured: isDefaultView(state), pending, categoryMode, basePath, navigate, reset, preview, openPreview }),
    [state, items, results, pending, categoryMode, basePath, navigate, reset, preview, openPreview],
  );

  return (
    <GalleryContext.Provider value={value}>
      <div
        className="[html[data-tpl-nav]_&_img]:!animate-none [html[data-tpl-nav]_&_img]:!opacity-100"
        onClickCapture={(e) => {
          // In-app: tiles and "Preview" links carry data-template-preview and open the sheet in place.
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          const a = (e.target as Element).closest?.("a[data-template-preview]");
          const id = a?.getAttribute("data-template-preview");
          if (!id) return;
          e.preventDefault();
          e.stopPropagation();
          openPreview(id);
        }}
      >
        {children}
      </div>
    </GalleryContext.Provider>
  );
}
