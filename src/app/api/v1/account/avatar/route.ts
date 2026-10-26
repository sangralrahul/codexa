import { badRequest, handler, json } from "@/lib/api";
import { requireApiUser } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { updateProfile } from "@/lib/billing/account-service";
import { avatarKey, avatarPath, avatarPrefix, deletePrefix, putBytes } from "@/lib/storage";

const MAX_BYTES = 2 * 1024 * 1024;

/** Image type from the file's first bytes (never trust the declared type; SVG is not accepted). */
function sniff(b: Uint8Array): { ext: string; type: string } | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return { ext: "gif", type: "image/gif" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: "webp", type: "image/webp" };
  return null;
}

/** POST /api/v1/account/avatar (multipart, field "file": PNG, JPEG, GIF or WebP up to 2 MB) → { user } */
export const POST = handler(async (req) => {
  const user = await requireApiUser();
  await enforceRateLimit(`account:avatar:${user.id}`, 20, 60 * 60_000);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") throw badRequest("Choose an image to upload");
  if (file.size > MAX_BYTES) throw badRequest("The image is larger than 2 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) throw badRequest("Use a PNG, JPG, GIF or WebP image");
  const name = `${crypto.randomUUID()}.${kind.ext}`;
  // Replace any earlier upload: only the newest photo is kept.
  await deletePrefix(avatarPrefix(user.id));
  await putBytes(avatarKey(user.id, name), bytes, kind.type);
  return json({ user: await updateProfile(user, { avatarUrl: avatarPath(user.id, name) }) });
});

/** DELETE /api/v1/account/avatar → { user } (back to initials) */
export const DELETE = handler(async () => {
  const user = await requireApiUser();
  await deletePrefix(avatarPrefix(user.id));
  return json({ user: await updateProfile(user, { avatarUrl: null }) });
});
