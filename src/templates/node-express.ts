import type { Template } from "./types";
import { NODE_DEPS, NODE_SETTINGS } from "./shared";

/**
 * The first template here defines the prebuilt dependency set the runner
 * installs for every node-express project (services/runner/prepare.ts).
 */

export const nodeExpressTemplates: Template[] = [
  {
    id: "node-express-api",
    name: "Express REST API",
    description: "A TypeScript Express API with routing, validation, and an in-memory store you can swap for PostgreSQL.",
    longDescription:
      "An Express 4 server written in TypeScript and run with tsx in development. It exposes a small todos resource with zod-validated request bodies and an in-memory array; replace the array with a database client and the handlers stay the same.",
    category: "web-apps",
    tags: ["node", "express", "api", "typescript", "backend"],
    framework: "node-express",
    dependencies: NODE_DEPS,
    settings: NODE_SETTINGS,
    prebuilt: true,
    difficulty: "intermediate",
    previewPath: "/api/todos",
    files: {
      "package.json": JSON.stringify(
        {
          name: "codexa-api",
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
import { z } from "zod";

const app = express();
app.use(express.json());

type Todo = { id: number; title: string; done: boolean };
const todos: Todo[] = [{ id: 1, title: "Describe your API in the Codexa chat", done: false }];
let nextId = 2;

const TodoInput = z.object({ title: z.string().min(1).max(200), done: z.boolean().optional() });

app.get("/", (_req, res) => {
  res.json({ name: "codexa-api", endpoints: ["GET /api/todos", "POST /api/todos", "PATCH /api/todos/:id", "DELETE /api/todos/:id"] });
});
app.get("/api/todos", (_req, res) => res.json(todos));
app.post("/api/todos", (req, res) => {
  const parsed = TodoInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const todo: Todo = { id: nextId++, title: parsed.data.title, done: parsed.data.done ?? false };
  todos.push(todo);
  res.status(201).json(todo);
});
app.patch("/api/todos/:id", (req, res) => {
  const todo = todos.find((t) => t.id === Number(req.params.id));
  if (!todo) return res.status(404).json({ error: "Not found" });
  const parsed = TodoInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  Object.assign(todo, parsed.data);
  res.json(todo);
});
app.delete("/api/todos/:id", (req, res) => {
  const i = todos.findIndex((t) => t.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: "Not found" });
  todos.splice(i, 1);
  res.status(204).end();
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, "0.0.0.0", () => console.log(\`API listening on http://localhost:\${port}\`));
`,
      "README.md": "# Express API\n\n```bash\nnpm install\nnpm run dev\n```\n",
      ".gitignore": "node_modules\ndist\n.env\n",
    },
  },
];
