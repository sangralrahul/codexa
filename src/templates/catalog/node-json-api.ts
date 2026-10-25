import type { Template } from "../types";
import { NODE_DEPS, NODE_SETTINGS } from "../shared";

const files: Record<string, string> = {
  "package.json": JSON.stringify(
    {
      name: "codexa-notes-api",
      private: true,
      version: "0.1.0",
      type: "module",
      scripts: { dev: "tsx watch src/server.ts", build: "tsc -p tsconfig.json", start: "node dist/server.js" },
      dependencies: { express: "^4.21.0", zod: "^3.24.0" },
      devDependencies: { "@types/express": "^4.17.21", "@types/node": "^22.0.0", tsx: "^4.19.0", typescript: "^5.8.0" },
    },
    null,
    2,
  ),
  "tsconfig.json": JSON.stringify(
    { compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", outDir: "dist", rootDir: "src", strict: true, esModuleInterop: true, skipLibCheck: true }, include: ["src"] },
    null,
    2,
  ),
  "src/server.ts": `import express from "express";
import { notesRouter } from "./routes/notes.js";
import { errorHandler, requestLogger } from "./middleware.js";

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.json({
    name: "notes-api",
    version: "0.1.0",
    endpoints: ["GET /health", "GET /api/notes?q=&tag=", "GET /api/notes/:id", "POST /api/notes", "PUT /api/notes/:id", "DELETE /api/notes/:id"],
  });
});
app.get("/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.use("/api/notes", notesRouter);

app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => console.log("notes-api listening on http://localhost:" + port));
`,
  "src/middleware.ts": `import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    console.log(req.method + " " + req.originalUrl + " -> " + res.statusCode + " (" + (Date.now() - start) + "ms)");
  });
  next();
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
`,
  "src/store.ts": `/**
 * In-memory store. Swap this module for a database client (pg, Supabase, Prisma ...) —
 * the router only depends on these four functions.
 */
export type Note = { id: string; title: string; body: string; tags: string[]; createdAt: string; updatedAt: string };

const notes = new Map<string, Note>();
let counter = 1;

function seed() {
  const now = new Date().toISOString();
  const first: Note = { id: String(counter++), title: "Welcome", body: "This API keeps notes in memory. Restarting the server clears them.", tags: ["intro"], createdAt: now, updatedAt: now };
  notes.set(first.id, first);
}
seed();

export function listNotes(filter: { q?: string; tag?: string }) {
  return Array.from(notes.values()).filter((n) => {
    if (filter.tag && !n.tags.includes(filter.tag)) return false;
    if (filter.q) {
      const q = filter.q.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    }
    return true;
  });
}
export function getNote(id: string) {
  return notes.get(id) ?? null;
}
export function saveNote(input: Omit<Note, "id" | "createdAt" | "updatedAt">, id?: string) {
  const now = new Date().toISOString();
  const existing = id ? notes.get(id) : undefined;
  const note: Note = { id: id ?? String(counter++), ...input, createdAt: existing?.createdAt ?? now, updatedAt: now };
  notes.set(note.id, note);
  return note;
}
export function deleteNote(id: string) {
  return notes.delete(id);
}
`,
  "src/routes/notes.ts": `import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../middleware.js";
import { deleteNote, getNote, listNotes, saveNote } from "../store.js";

export const notesRouter = Router();

const NoteInput = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().max(10_000).default(""),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

const Query = z.object({ q: z.string().optional(), tag: z.string().optional() });

notesRouter.get("/", (req, res) => {
  const parsed = Query.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, "Invalid query");
  res.json({ notes: listNotes(parsed.data) });
});

notesRouter.get("/:id", (req, res) => {
  const note = getNote(req.params.id);
  if (!note) throw new HttpError(404, "Note not found");
  res.json({ note });
});

notesRouter.post("/", (req, res) => {
  const parsed = NoteInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  res.status(201).json({ note: saveNote(parsed.data) });
});

notesRouter.put("/:id", (req, res) => {
  if (!getNote(req.params.id)) throw new HttpError(404, "Note not found");
  const parsed = NoteInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  res.json({ note: saveNote(parsed.data, req.params.id) });
});

notesRouter.delete("/:id", (req, res) => {
  if (!deleteNote(req.params.id)) throw new HttpError(404, "Note not found");
  res.status(204).end();
});
`,
  "README.md": `# Notes API

A structured Express + TypeScript REST API: router module, request logging, central error handling, zod validation and an
in-memory store behind a four-function interface.

\`\`\`bash
npm install
npm run dev
curl http://localhost:3000/api/notes
\`\`\`
`,
  ".gitignore": "node_modules\ndist\n.env\n",
};

export const nodeJsonApiTemplate: Template = {
  id: "node-express-notes-api",
  name: "Structured Express API",
  description: "A notes REST API split into router, middleware, and store modules, with logging, error handling, and search.",
  longDescription:
    "A step up from the single-file Express starter: routes live in src/routes, cross-cutting concerns (request logging, an HttpError class and a central error handler) in src/middleware.ts, and persistence behind a small store interface so a database can replace the in-memory Map without touching handlers. Supports search and tag filtering through validated query parameters.",
  category: "web-apps",
  tags: ["node", "express", "api", "rest", "typescript", "backend"],
  framework: "node-express",
  dependencies: NODE_DEPS,
  settings: NODE_SETTINGS,
  prebuilt: true,
  difficulty: "intermediate",
  previewPath: "/api/notes",
  files,
};
