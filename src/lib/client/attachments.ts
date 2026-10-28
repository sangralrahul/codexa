"use client";

/**
 * Images attached to an AI prompt (screenshots, sketches, designs). They are downscaled in the
 * browser before upload, so a phone photo or a 5K screenshot becomes a few hundred KB the model
 * can read, and the request stays well under the API body limit.
 */
export type PromptImage = { id: string; name: string; mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string; width: number; height: number };

export const MAX_PROMPT_IMAGES = 4;
const MAX_EDGE = 1568;
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const IMAGE_ACCEPT = ACCEPT.join(",");
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/** Where the API serves an attached image (project members only). */
export function attachmentUrl(projectId: string, file: string) {
  return `/api/v1/projects/${encodeURIComponent(projectId)}/attachments/${encodeURIComponent(file)}`;
}

export function dataUrlOf(img: PromptImage) {
  return `data:${img.mediaType};base64,${img.data}`;
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image could not be read."));
    };
    img.src = url;
  });
}

/** Read, downscale (longest edge 1568px) and re-encode one image file. */
export async function prepareImage(file: File): Promise<PromptImage> {
  if (!ACCEPT.includes(file.type)) throw new Error(`${file.name || "That file"} is not a PNG, JPEG, WebP or GIF image.`);
  if (file.size > MAX_SOURCE_BYTES) throw new Error(`${file.name || "That image"} is larger than 20 MB.`);
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process this image.");
  ctx.fillStyle = "#ffffff"; // transparent PNGs become white, not black, as JPEG
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
  return { id: crypto.randomUUID(), name: file.name || "pasted-image.jpg", mediaType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1), width, height };
}

/** Images from a paste or drop event's DataTransfer. */
export function imageFilesFrom(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const files = Array.from(dt.files ?? []).filter((f) => f.type.startsWith("image/"));
  if (files.length) return files;
  return Array.from(dt.items ?? [])
    .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
    .map((i) => i.getAsFile())
    .filter((f): f is File => f !== null);
}

/** Prepare several files, respecting the per-prompt limit. Returns what fit and the first error. */
export async function addImages(current: PromptImage[], files: File[]): Promise<{ images: PromptImage[]; error: string | null }> {
  let error: string | null = null;
  const room = MAX_PROMPT_IMAGES - current.length;
  if (room <= 0) return { images: current, error: `You can attach up to ${MAX_PROMPT_IMAGES} images.` };
  if (files.length > room) error = `Only ${MAX_PROMPT_IMAGES} images can be attached; the rest were left out.`;
  const out = [...current];
  for (const f of files.slice(0, room)) {
    try {
      out.push(await prepareImage(f));
    } catch (err) {
      error ??= err instanceof Error ? err.message : "This image could not be added.";
    }
  }
  return { images: out, error };
}

const INITIAL_IMAGES_KEY = "codexa:initialImages";

/** Hand images from the dashboard composer to the editor's chat (sessionStorage, read once). */
export function stashInitialImages(images: PromptImage[]) {
  try {
    if (images.length) window.sessionStorage.setItem(INITIAL_IMAGES_KEY, JSON.stringify(images));
    else window.sessionStorage.removeItem(INITIAL_IMAGES_KEY);
  } catch {
    /* storage full or blocked: the prompt still goes through without images */
  }
}

export function takeInitialImages(): PromptImage[] {
  try {
    const raw = window.sessionStorage.getItem(INITIAL_IMAGES_KEY);
    window.sessionStorage.removeItem(INITIAL_IMAGES_KEY);
    return raw ? (JSON.parse(raw) as PromptImage[]).slice(0, MAX_PROMPT_IMAGES) : [];
  } catch {
    return [];
  }
}
