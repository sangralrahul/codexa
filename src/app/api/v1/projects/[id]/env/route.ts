import { z } from "zod";
import { badRequest, forbidden, handler, json, notFound, parseBody } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { assertProjectAccess, roleAtLeast } from "@/lib/services/access";
import { deleteEnvVar, listEnvVars, upsertEnvVar } from "@/lib/services/env-vars";
import { logActivity } from "@/lib/services/projects";

type Ctx = { params: Promise<{ id: string }> };

/** GET /env → masked values; GET /env?reveal=1 → decrypted values (editor role or above). */
export const GET = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const { role } = await assertProjectAccess(user, id, "viewer");
  const reveal = new URL(req.url).searchParams.get("reveal") === "1";
  if (reveal && !roleAtLeast(role, "editor")) throw forbidden("Only editors can reveal environment variable values");
  const vars = await listEnvVars(id, { reveal });
  return json({ vars, revealed: reveal });
});

const entry = z.object({ key: z.string().min(1).max(128), value: z.string().max(10_000), isSecret: z.boolean().optional() });
const putSchema = z.union([entry, z.object({ vars: z.array(entry).min(1).max(100) })]);

/** PUT /env  { key, value, isSecret? }  or  { vars: [{ key, value }] } — upsert. */
export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const body = await parseBody(req, putSchema);
  const entries = "vars" in body ? body.vars : [body];
  const saved = [];
  for (const e of entries) saved.push(await upsertEnvVar(id, e));
  await logActivity(id, user.id, "env.updated", `Updated environment variable${saved.length === 1 ? "" : "s"} ${saved.map((s) => s.key).join(", ")}`, {
    keys: saved.map((s) => s.key),
  });
  const vars = await listEnvVars(id, { reveal: false });
  return json({ saved, vars });
});

/** DELETE /env?key=NAME */
export const DELETE = handler<Ctx>(async (req, ctx) => {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await assertProjectAccess(user, id, "editor");
  const key = new URL(req.url).searchParams.get("key");
  if (!key) throw badRequest("key is required");
  const ok = await deleteEnvVar(id, key);
  if (!ok) throw notFound("Environment variable");
  await logActivity(id, user.id, "env.deleted", `Removed environment variable ${key}`, { key });
  return new Response(null, { status: 204 });
});
