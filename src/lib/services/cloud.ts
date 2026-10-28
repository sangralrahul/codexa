import "server-only";
import { and, count, desc, eq, gt, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db, runBatch } from "@/db";
import { appCollections, appRecords, appSessions, appUsers, projects, type Project } from "@/db/schema";
import { ApiError, badRequest, conflict, notFound } from "@/lib/api";
import { hashPassword, hashToken, randomToken, verifyPassword } from "@/lib/crypto";
import { env } from "@/lib/env";
import { normalizeEmail } from "@/lib/auth/users";
import { cloudSdkFile, cloudSdkPath, cloudSdkSnippet } from "@/lib/services/cloud-sdk";
import { logActivity, updateProject, writeFile } from "@/lib/services/projects";

/*
 * Codexa Cloud: a built-in database and end-user accounts for apps people build.
 * "App users" are users of the generated app, never Codexa users.
 */

export const CLOUD_LIMITS = {
  maxRecordBytes: 64 * 1024,
  maxRecordsPerProject: 20_000,
  maxCollectionsPerProject: 100,
  maxListLimit: 100,
  defaultListLimit: 50,
  maxWhereFields: 5,
  sessionDays: 30,
} as const;

export const COLLECTION_NAME_RE = /^[a-z][a-z0-9_]{0,39}$/;
const FIELD_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const RESERVED_FIELDS = new Set(["id", "ownerId", "createdAt", "updatedAt"]);

export const COLLECTION_ACCESS = ["private", "public_read", "public"] as const;
export type CollectionAccess = (typeof COLLECTION_ACCESS)[number];

export type PublicAppUser = { id: string; email: string; name: string; createdAt: string };
export type WhereFilter = Record<string, string | number | boolean | null>;
export type CloudRecordOut = Record<string, unknown> & { id: string; ownerId: string | null; createdAt: string; updatedAt: string };

export function unauthorized(message = "Sign in required") {
  return new ApiError(401, message, "unauthorized");
}

export function cloudApiBase(projectId: string) {
  return `${env.APP_URL.replace(/\/+$/, "")}/api/apps/${projectId}`;
}

export function assertCollectionName(name: string) {
  if (!COLLECTION_NAME_RE.test(name)) {
    throw badRequest("Collection names start with a lowercase letter and use only a-z, 0-9 and _ (max 40 characters)");
  }
}

// ---------------------------------------------------------------------------
// Project switch
// ---------------------------------------------------------------------------

/** The project behind a public app API call: must exist, not be deleted, and have Cloud on (404 otherwise). */
export async function getCloudProject(projectId: string): Promise<Pick<Project, "id" | "framework">> {
  const rows = await db
    .select({ id: projects.id, framework: projects.framework, settings: projects.settings })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);
  const p = rows[0];
  if (!p || p.settings?.cloudEnabled !== true) throw notFound("App");
  return { id: p.id, framework: p.framework };
}

/** Turn Cloud on: write the client SDK into the project and set the flag. Idempotent. */
export async function enableCloud(project: Project, actorId: string | null) {
  const sdk = cloudSdkFile(project.framework, cloudApiBase(project.id), project.id);
  await writeFile(project.id, sdk.path, sdk.content);
  await updateProject(project.id, { settings: { ...project.settings, cloudEnabled: true } });
  await logActivity(project.id, actorId, "cloud.enabled", `Turned on Codexa Cloud (wrote ${sdk.path})`, { path: sdk.path });
  return { sdkPath: sdk.path };
}

/** Turn Cloud off: the app API stops answering; data and users are kept. */
export async function disableCloud(project: Project, actorId: string | null) {
  await updateProject(project.id, { settings: { ...project.settings, cloudEnabled: false } });
  await logActivity(project.id, actorId, "cloud.disabled", "Turned off Codexa Cloud (data kept)", {});
}

export async function getCloudStatus(project: Project) {
  const enabled = project.settings?.cloudEnabled === true;
  const [[users], perCollection, collections] = await Promise.all([
    db.select({ c: count() }).from(appUsers).where(eq(appUsers.projectId, project.id)),
    db
      .select({ collection: appRecords.collection, c: count() })
      .from(appRecords)
      .where(eq(appRecords.projectId, project.id))
      .groupBy(appRecords.collection),
    db.select().from(appCollections).where(eq(appCollections.projectId, project.id)).orderBy(appCollections.name),
  ]);
  const counts = new Map(perCollection.map((r) => [r.collection, Number(r.c)]));
  const list = collections.map((c) => ({ name: c.name, access: c.access as CollectionAccess, records: counts.get(c.name) ?? 0, createdAt: c.createdAt.toISOString() }));
  return {
    enabled,
    apiBase: cloudApiBase(project.id),
    sdkPath: cloudSdkPath(project.framework),
    snippet: cloudSdkSnippet(project.framework),
    counts: { users: Number(users?.c ?? 0), records: [...counts.values()].reduce((a, b) => a + b, 0), collections: list.length },
    limits: { maxRecordBytes: CLOUD_LIMITS.maxRecordBytes, maxRecordsPerProject: CLOUD_LIMITS.maxRecordsPerProject },
    collections: list,
  };
}

// ---------------------------------------------------------------------------
// App users and sessions
// ---------------------------------------------------------------------------

function toPublicUser(u: { id: string; email: string; name: string; createdAt: Date }): PublicAppUser {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt.toISOString() };
}

async function issueSession(projectId: string, appUserId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + CLOUD_LIMITS.sessionDays * 24 * 60 * 60 * 1000);
  await db.insert(appSessions).values({ projectId, appUserId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function signUpAppUser(projectId: string, input: { email: string; password: string; name?: string }) {
  const email = normalizeEmail(input.email);
  const existing = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(and(eq(appUsers.projectId, projectId), eq(appUsers.email, email)))
    .limit(1);
  if (existing.length) throw conflict("An account with this email already exists");
  const passwordHash = await hashPassword(input.password);
  const name = input.name?.trim() || "";
  let user;
  try {
    [user] = await db.insert(appUsers).values({ projectId, email, name, passwordHash, lastSignInAt: new Date() }).returning();
  } catch (err) {
    if (String(err).includes("UNIQUE")) throw conflict("An account with this email already exists");
    throw err;
  }
  const session = await issueSession(projectId, user.id);
  return { user: toPublicUser(user), ...session };
}

let dummyHash: Promise<string> | null = null;

export async function signInAppUser(projectId: string, input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const [user] = await db
    .select()
    .from(appUsers)
    .where(and(eq(appUsers.projectId, projectId), eq(appUsers.email, email)))
    .limit(1);
  // Hash even for unknown emails so response time does not reveal which accounts exist.
  dummyHash ??= hashPassword(randomToken(16));
  const ok = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash));
  if (!user || !ok) throw new ApiError(401, "Incorrect email or password", "invalid_credentials");
  const now = new Date();
  await runBatch([
    db.update(appUsers).set({ lastSignInAt: now }).where(eq(appUsers.id, user.id)),
    // Housekeeping: drop this user's expired sessions.
    db.delete(appSessions).where(and(eq(appSessions.appUserId, user.id), lt(appSessions.expiresAt, now))),
  ]);
  const session = await issueSession(projectId, user.id);
  return { user: toPublicUser(user), ...session };
}

/** Resolve a bearer token to the app user of this project, or null (missing, unknown or expired). */
export async function appUserFromToken(projectId: string, token: string | null): Promise<PublicAppUser | null> {
  if (!token || token.length > 200) return null;
  const rows = await db
    .select({ id: appUsers.id, email: appUsers.email, name: appUsers.name, createdAt: appUsers.createdAt })
    .from(appSessions)
    .innerJoin(appUsers, eq(appUsers.id, appSessions.appUserId))
    .where(and(eq(appSessions.tokenHash, hashToken(token)), eq(appSessions.projectId, projectId), gt(appSessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ? toPublicUser(rows[0]) : null;
}

export async function signOutAppUser(projectId: string, token: string | null) {
  if (!token) return;
  await db.delete(appSessions).where(and(eq(appSessions.tokenHash, hashToken(token)), eq(appSessions.projectId, projectId)));
}

/** Panel: app users, newest first. */
export async function listAppUsers(projectId: string, opts: { limit?: number; cursor?: string | null } = {}) {
  const limit = clampLimit(opts.limit);
  const cur = decodeCursor(opts.cursor);
  const where = [eq(appUsers.projectId, projectId)];
  if (cur) where.push(or(lt(appUsers.createdAt, cur.at), and(eq(appUsers.createdAt, cur.at), lt(appUsers.id, cur.id)))!);
  const rows = await db
    .select({ id: appUsers.id, email: appUsers.email, name: appUsers.name, createdAt: appUsers.createdAt, lastSignInAt: appUsers.lastSignInAt })
    .from(appUsers)
    .where(and(...where))
    .orderBy(desc(appUsers.createdAt), desc(appUsers.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  return {
    users: page.map((u) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.createdAt.toISOString(), lastSignInAt: u.lastSignInAt?.toISOString() ?? null })),
    nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1]) : null,
  };
}

/** Panel: delete an app user, their sessions and the records they own. */
export async function deleteAppUser(projectId: string, appUserId: string) {
  const [u] = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(and(eq(appUsers.id, appUserId), eq(appUsers.projectId, projectId)))
    .limit(1);
  if (!u) throw notFound("User");
  await runBatch([
    db.delete(appRecords).where(and(eq(appRecords.projectId, projectId), eq(appRecords.ownerId, appUserId))),
    db.delete(appUsers).where(and(eq(appUsers.id, appUserId), eq(appUsers.projectId, projectId))),
  ]);
}

// ---------------------------------------------------------------------------
// Collections and records
// ---------------------------------------------------------------------------

function clampLimit(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit)) return CLOUD_LIMITS.defaultListLimit;
  return Math.min(CLOUD_LIMITS.maxListLimit, Math.max(1, Math.floor(limit)));
}

function encodeCursor(row: { createdAt: Date; id: string }) {
  return Buffer.from(`${row.createdAt.getTime()}.${row.id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string | null | undefined): { at: Date; id: string } | null {
  if (!cursor) return null;
  const raw = Buffer.from(cursor, "base64url").toString("utf8");
  const dot = raw.indexOf(".");
  const ms = Number(raw.slice(0, dot));
  const id = raw.slice(dot + 1);
  if (dot < 1 || !Number.isSafeInteger(ms) || !id || id.length > 64) throw badRequest("Invalid cursor");
  return { at: new Date(ms), id };
}

async function getCollection(projectId: string, name: string) {
  const [row] = await db
    .select()
    .from(appCollections)
    .where(and(eq(appCollections.projectId, projectId), eq(appCollections.name, name)))
    .limit(1);
  return row ?? null;
}

function toRecord(r: { id: string; ownerId: string | null; data: Record<string, unknown>; createdAt: Date; updatedAt: Date }): CloudRecordOut {
  return { ...r.data, id: r.id, ownerId: r.ownerId, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}

/** Validate a record body: a plain JSON object ≤ 64 KB. System fields are dropped. */
export function cleanRecordData(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw badRequest("Record data must be a JSON object");
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (RESERVED_FIELDS.has(k) || v === undefined) continue;
    out[k] = v;
  }
  const bytes = Buffer.byteLength(JSON.stringify(out), "utf8");
  if (bytes > CLOUD_LIMITS.maxRecordBytes) throw new ApiError(413, `Record is ${bytes} bytes; the limit is ${CLOUD_LIMITS.maxRecordBytes} bytes`, "too_large");
  return out;
}

function whereClauses(where: WhereFilter | undefined): SQL[] {
  if (!where) return [];
  const entries = Object.entries(where);
  if (entries.length > CLOUD_LIMITS.maxWhereFields) throw badRequest(`Filter on at most ${CLOUD_LIMITS.maxWhereFields} fields`);
  return entries.map(([field, value]) => {
    if (!FIELD_RE.test(field)) throw badRequest(`Invalid filter field: ${field}`);
    if (field === "ownerId") return value === null ? isNull(appRecords.ownerId) : eq(appRecords.ownerId, String(value));
    if (RESERVED_FIELDS.has(field)) throw badRequest(`Cannot filter on ${field}`);
    const extracted = sql`json_extract(${appRecords.data}, ${"$." + field})`;
    if (value === null) return sql`${extracted} IS NULL`;
    if (typeof value === "boolean") return sql`${extracted} = ${value ? 1 : 0}`;
    if (typeof value === "string" || typeof value === "number") return sql`${extracted} = ${value}`;
    throw badRequest(`Filter values must be strings, numbers, booleans or null (${field})`);
  });
}

async function queryRecords(projectId: string, collection: string, opts: { where?: WhereFilter; limit?: number; cursor?: string | null; ownerId?: string }) {
  const limit = clampLimit(opts.limit);
  const cur = decodeCursor(opts.cursor);
  const conds: SQL[] = [eq(appRecords.projectId, projectId), eq(appRecords.collection, collection), ...whereClauses(opts.where)];
  if (opts.ownerId) conds.push(eq(appRecords.ownerId, opts.ownerId));
  if (cur) conds.push(or(lt(appRecords.createdAt, cur.at), and(eq(appRecords.createdAt, cur.at), lt(appRecords.id, cur.id)))!);
  const rows = await db
    .select()
    .from(appRecords)
    .where(and(...conds))
    .orderBy(desc(appRecords.createdAt), desc(appRecords.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  return { items: page.map(toRecord), nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1]) : null };
}

type Actor = PublicAppUser | null;

/** Public API: list records the actor may read. */
export async function listRecords(projectId: string, name: string, actor: Actor, opts: { where?: WhereFilter; limit?: number; cursor?: string | null }) {
  assertCollectionName(name);
  const col = await getCollection(projectId, name);
  if (!col) {
    // Nothing stored yet; validate the filter anyway so mistakes show up early.
    whereClauses(opts.where);
    decodeCursor(opts.cursor);
    return { items: [], nextCursor: null };
  }
  if (col.access === "private") {
    if (!actor) throw unauthorized();
    return queryRecords(projectId, name, { ...opts, ownerId: actor.id });
  }
  return queryRecords(projectId, name, opts);
}

async function findRecord(projectId: string, name: string, id: string) {
  const [row] = await db
    .select()
    .from(appRecords)
    .where(and(eq(appRecords.id, id), eq(appRecords.projectId, projectId), eq(appRecords.collection, name)))
    .limit(1);
  return row ?? null;
}

export async function getRecord(projectId: string, name: string, id: string, actor: Actor) {
  assertCollectionName(name);
  const col = await getCollection(projectId, name);
  if (!col) throw notFound("Record");
  if (col.access === "private" && !actor) throw unauthorized();
  const row = await findRecord(projectId, name, id);
  if (!row || (col.access === "private" && row.ownerId !== actor?.id)) throw notFound("Record");
  return toRecord(row);
}

export async function createRecord(projectId: string, name: string, actor: Actor, data: unknown) {
  assertCollectionName(name);
  const clean = cleanRecordData(data);
  const col = await getCollection(projectId, name);
  const access = (col?.access ?? "private") as CollectionAccess;
  if (access !== "public" && !actor) throw unauthorized();
  const [[total], [collections]] = await Promise.all([
    db.select({ c: count() }).from(appRecords).where(eq(appRecords.projectId, projectId)),
    col ? Promise.resolve([{ c: 0 }]) : db.select({ c: count() }).from(appCollections).where(eq(appCollections.projectId, projectId)),
  ]);
  if (Number(total?.c ?? 0) >= CLOUD_LIMITS.maxRecordsPerProject) {
    throw new ApiError(403, `This app has reached the limit of ${CLOUD_LIMITS.maxRecordsPerProject.toLocaleString("en-US")} records`, "limit_reached");
  }
  if (!col && Number(collections?.c ?? 0) >= CLOUD_LIMITS.maxCollectionsPerProject) {
    throw new ApiError(403, `This app has reached the limit of ${CLOUD_LIMITS.maxCollectionsPerProject} collections`, "limit_reached");
  }
  const now = new Date();
  const id = crypto.randomUUID();
  await runBatch([
    db.insert(appCollections).values({ projectId, name, access: "private" }).onConflictDoNothing(),
    db.insert(appRecords).values({ id, projectId, collection: name, ownerId: actor?.id ?? null, data: clean, createdAt: now, updatedAt: now }),
  ]);
  return toRecord({ id, ownerId: actor?.id ?? null, data: clean, createdAt: now, updatedAt: now });
}

/** Edits and deletes need a signed-in owner in every access mode. */
async function ownedRecord(projectId: string, name: string, id: string, actor: Actor) {
  assertCollectionName(name);
  const col = await getCollection(projectId, name);
  if (!col) throw notFound("Record");
  if (!actor) throw unauthorized();
  const row = await findRecord(projectId, name, id);
  if (!row) throw notFound("Record");
  if (row.ownerId !== actor.id) {
    if (col.access === "private") throw notFound("Record");
    throw new ApiError(403, "Only the user who created this record can change it", "forbidden");
  }
  return row;
}

export async function updateRecord(projectId: string, name: string, id: string, actor: Actor, patch: unknown) {
  const cleanPatch = cleanRecordData(patch);
  const row = await ownedRecord(projectId, name, id, actor);
  const data = cleanRecordData({ ...row.data, ...cleanPatch });
  const updatedAt = new Date();
  await db.update(appRecords).set({ data, updatedAt }).where(eq(appRecords.id, row.id));
  return toRecord({ ...row, data, updatedAt });
}

export async function deleteRecord(projectId: string, name: string, id: string, actor: Actor) {
  const row = await ownedRecord(projectId, name, id, actor);
  await db.delete(appRecords).where(eq(appRecords.id, row.id));
}

// ---------------------------------------------------------------------------
// Panel (Codexa project members; no access rules apply)
// ---------------------------------------------------------------------------

/** Create a collection or change its access. */
export async function setCollectionAccess(projectId: string, name: string, access: CollectionAccess) {
  assertCollectionName(name);
  const existing = await getCollection(projectId, name);
  if (!existing) {
    const [n] = await db.select({ c: count() }).from(appCollections).where(eq(appCollections.projectId, projectId));
    if (Number(n?.c ?? 0) >= CLOUD_LIMITS.maxCollectionsPerProject) throw badRequest(`At most ${CLOUD_LIMITS.maxCollectionsPerProject} collections per app`);
  }
  await db
    .insert(appCollections)
    .values({ projectId, name, access })
    .onConflictDoUpdate({ target: [appCollections.projectId, appCollections.name], set: { access } });
  return { name, access, created: !existing };
}

export async function adminListRecords(projectId: string, name: string, opts: { limit?: number; cursor?: string | null }) {
  assertCollectionName(name);
  const col = await getCollection(projectId, name);
  if (!col) throw notFound("Collection");
  return queryRecords(projectId, name, opts);
}

export async function adminDeleteRecord(projectId: string, name: string, id: string) {
  const rows = await db
    .delete(appRecords)
    .where(and(eq(appRecords.id, id), eq(appRecords.projectId, projectId), eq(appRecords.collection, name)))
    .returning({ id: appRecords.id });
  if (!rows.length) throw notFound("Record");
}
