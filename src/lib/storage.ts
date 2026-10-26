/**
 * Object storage on Cloudflare R2 (binding STORAGE): project snapshots and
 * Codexa-hosted site files. D1 rows are limited to 2 MB, so whole-project
 * payloads live here and D1 keeps only metadata and keys.
 */
import { requireBinding } from "@/lib/cloudflare/bindings";

export async function putJson(key: string, value: unknown) {
  const body = JSON.stringify(value);
  await requireBinding("STORAGE").put(key, body, { httpMetadata: { contentType: "application/json" } });
  return new TextEncoder().encode(body).byteLength;
}

export async function getJson<T>(key: string): Promise<T | null> {
  const obj = await requireBinding("STORAGE").get(key);
  if (!obj) return null;
  return JSON.parse(await obj.text()) as T;
}

export async function deleteObjects(keys: string[]) {
  if (!keys.length) return;
  const bucket = requireBinding("STORAGE");
  for (let i = 0; i < keys.length; i += 1000) await bucket.delete(keys.slice(i, i + 1000));
}

export async function deletePrefix(prefix: string) {
  const bucket = requireBinding("STORAGE");
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor });
    await deleteObjects(page.objects.map((o) => o.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

export const snapshotKey = (projectId: string, snapshotId: string) => `snapshots/${projectId}/${snapshotId}.json`;

export async function putBytes(key: string, bytes: ArrayBuffer | Uint8Array, contentType: string) {
  await requireBinding("STORAGE").put(key, bytes, { httpMetadata: { contentType } });
}

export async function getObject(key: string) {
  return requireBinding("STORAGE").get(key);
}

/** Uploaded profile photos: one random file name per upload, so URLs can be cached forever. */
export const avatarPrefix = (userId: string) => `avatars/${userId}/`;
export const avatarKey = (userId: string, file: string) => `${avatarPrefix(userId)}${file}`;
export const avatarPath = (userId: string, file: string) => `/api/v1/avatars/${userId}/${file}`;
