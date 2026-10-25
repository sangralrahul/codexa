import type { ProjectSettings } from "@/db/schema";

/**
 * Shared boilerplate for starter templates.
 *
 * IMPORTANT: the runner builds its prebuilt dependency sets from the package.json
 * of the first template of each framework (see services/runner/prepare.ts).
 * Every template of a framework must therefore declare exactly the same
 * dependencies — the lists below are the only allowed ones.
 */

export const VITE_PACKAGE_DEPENDENCIES = { react: "^19.1.0", "react-dom": "^19.1.0" } as const;
export const VITE_PACKAGE_DEV_DEPENDENCIES = {
  "@types/react": "^19.1.0",
  "@types/react-dom": "^19.1.0",
  "@vitejs/plugin-react": "^4.4.0",
  "@tailwindcss/vite": "^4.1.0",
  tailwindcss: "^4.1.0",
  typescript: "^5.8.0",
  vite: "^6.3.0",
} as const;

/** Dependencies documented on the public template pages. */
export const VITE_DEPS: Record<string, string> = {
  react: "^19.1.0",
  "react-dom": "^19.1.0",
  vite: "^6.3.0",
  "@vitejs/plugin-react": "^4.4.0",
  tailwindcss: "^4.1.0",
  "@tailwindcss/vite": "^4.1.0",
  typescript: "^5.8.0",
};

export const VITE_SETTINGS: ProjectSettings = { devCommand: "npm run dev", buildCommand: "npm run build", installCommand: "npm install", outputDir: "dist", port: 5173 };
export const STATIC_SETTINGS: ProjectSettings = { devCommand: "codexa-static", buildCommand: "", installCommand: "", outputDir: ".", port: 5173 };
export const NODE_SETTINGS: ProjectSettings = { devCommand: "npm run dev", buildCommand: "npm run build", installCommand: "npm install", outputDir: "dist", port: 3000 };

export const NODE_DEPS: Record<string, string> = { express: "^4.21.0", zod: "^3.24.0", tsx: "^4.19.0", typescript: "^5.8.0" };

export function vitePackageJson(name: string) {
  return JSON.stringify(
    {
      name,
      private: true,
      version: "0.1.0",
      type: "module",
      scripts: { dev: "vite --host 0.0.0.0 --port $PORT", build: "tsc -b && vite build", preview: "vite preview --host 0.0.0.0 --port $PORT" },
      dependencies: VITE_PACKAGE_DEPENDENCIES,
      devDependencies: VITE_PACKAGE_DEV_DEPENDENCIES,
    },
    null,
    2,
  );
}

export const VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    allowedHosts: true,
    hmr: process.env.CODEXA_PREVIEW_HOST
      ? { host: process.env.CODEXA_PREVIEW_HOST, clientPort: Number(process.env.CODEXA_PREVIEW_PORT) || 80, protocol: "ws" }
      : undefined,
  },
});
`;

export const VITE_TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      isolatedModules: true,
      allowImportingTsExtensions: true,
      types: ["vite/client"],
    },
    include: ["src"],
  },
  null,
  2,
);

export function viteIndexHtml(title: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

export const VITE_MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

export const VITE_INDEX_CSS = `@import "tailwindcss";

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}
`;

/** The full set of boilerplate files for a Vite + React + Tailwind template. Add src/App.tsx and friends on top. */
export function viteBase(opts: { name: string; title: string; readme: string }): Record<string, string> {
  return {
    "package.json": vitePackageJson(opts.name),
    "vite.config.ts": VITE_CONFIG,
    "tsconfig.json": VITE_TSCONFIG,
    "index.html": viteIndexHtml(opts.title),
    "src/main.tsx": VITE_MAIN,
    "src/index.css": VITE_INDEX_CSS,
    "README.md": opts.readme,
    ".gitignore": "node_modules\ndist\n.env\n",
  };
}

/** A tiny hash-based router shared by the multi-page SPA templates (no extra dependency needed). */
export const HASH_ROUTER = `import { useEffect, useState, type ReactNode } from "react";

/** Minimal hash router: "#/path" -> "/path". Replace with react-router if you need nested routes. */
export function useHashRoute(defaultPath = "/") {
  const read = () => {
    const h = window.location.hash.replace(/^#/, "");
    return h.startsWith("/") ? h : defaultPath;
  };
  const [path, setPath] = useState<string>(() => (typeof window === "undefined" ? defaultPath : read()));
  useEffect(() => {
    const onChange = () => setPath(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return path;
}

export function navigate(path: string) {
  window.location.hash = path.startsWith("/") ? path : "/" + path;
}

export function Link({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <a href={"#" + to} className={className}>
      {children}
    </a>
  );
}
`;

/** A tiny typed localStorage hook shared by templates that persist local state. */
export const USE_LOCAL_STORAGE = `import { useEffect, useState } from "react";

/** Persist state in localStorage. Safe when storage is unavailable (private mode). */
export function useLocalStorage<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / privacy errors
    }
  }, [key, value]);
  return [value, setValue];
}
`;
