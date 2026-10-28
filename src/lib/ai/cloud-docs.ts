/** System-prompt section that teaches the agent the Codexa Cloud SDK (only when Cloud is on for the project). */
export function cloudPromptSection(enabled: boolean): string | null {
  if (!enabled) return null;
  return `## Codexa Cloud (enabled for this project)
This app has a built-in database and user accounts. Use them for anything that must persist or be shared, and for sign-up/login. Do NOT use localStorage for app data, do NOT invent a backend, server, or third-party service (Firebase, Supabase, etc.), and NEVER hardcode API keys or secrets: none are needed.

The client is already in the project: \`src/lib/codexa.ts\` (Vite/React; import it with the correct relative path, e.g. \`import { auth, db } from "./lib/codexa"\` from src/App.tsx, \`"../lib/codexa"\` from src/components/X.tsx) or \`codexa.js\` at the root of static sites (\`import { auth, db } from "./codexa.js"\` in a \`<script type="module">\`). Do not rewrite or replace that file; if it is missing, ask the user to turn Cloud on again from Tools → Cloud.

Auth (email + password; the session is kept for 30 days):
- \`await auth.signUp({ email, password, name })\` → user (password ≥ 8 chars) · \`await auth.signIn({ email, password })\` → user · \`await auth.signOut()\`
- \`await auth.user()\` → \`{ id, email, name, createdAt } | null\`
- \`const off = auth.onChange((user) => ...)\` fires now and on every change; call \`off()\` on cleanup (React: \`useEffect(() => auth.onChange(setUser), [])\`).

Database (schemaless JSON records in named collections; names match /^[a-z][a-z0-9_]{0,39}$/, e.g. "todos", "blog_posts"; collections are created on first write):
- \`const todos = db.collection<Todo>("todos")\`
- \`await todos.list({ where: { done: false }, limit: 50 })\` → records, newest first (limit 1–100; \`where\` is equality on top-level fields only, string/number/boolean/null; add \`ownerId: user.id\` to get only the current user's records). Use \`.page({ where, limit, cursor })\` → \`{ items, nextCursor }\` for pagination. Sort or search other ways on the client.
- \`await todos.get(id)\` · \`await todos.add({ title, done: false })\` → record · \`await todos.update(id, { done: true })\` (shallow merge) · \`await todos.remove(id)\`
- Every record has \`id\`, \`ownerId\` (the creating user or null), \`createdAt\`, \`updatedAt\` (ISO strings) plus your fields. Keep each record under 64 KB; store files elsewhere, not as base64.
- Errors throw \`CloudError\` with \`status\` and \`code\` (401 unauthorized, 403 forbidden, 404 not_found, 409 conflict, 429 rate_limited). Show friendly messages and loading states.

Access is set per collection by the project owner (Tools → Cloud → Data), default "private":
- private: a signed-in user reads and writes only their own records (right for todos, notes, personal data).
- public_read: anyone can read; signed-in users create records and edit/delete their own (blog posts, listings, comments).
- public: anyone can read and create without signing in; only the signed-in creator can edit/delete (guestbooks, contact or waitlist forms).
Only the creator of a record can update or remove it. If the app needs public_read or public, build it and tell the user in your summary exactly which collection to switch in Cloud → Data. Gate private screens behind sign-in and handle the signed-out state.`;
}
