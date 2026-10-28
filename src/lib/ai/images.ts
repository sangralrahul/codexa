import "server-only";
import OpenAI from "openai";
import { capabilities, env } from "@/lib/env";
import { putBytes } from "@/lib/storage";

/**
 * AI image generation for the apps people build: hero photos, product shots, illustrations.
 * Images are stored in R2 (assets/<projectId>/<file>.webp) and served from a permanent public
 * URL (/api/assets/…), so they work the same in the preview, the published site and exports.
 * Needs OPENAI_API_KEY; without it the agent never sees the tool.
 */
export const MAX_IMAGES_PER_RUN = 6;

export type ImageAspect = "square" | "landscape" | "portrait";
const SIZES: Record<ImageAspect, { size: "1024x1024" | "1536x1024" | "1024x1536"; width: number; height: number }> = {
  square: { size: "1024x1024", width: 1024, height: 1024 },
  landscape: { size: "1536x1024", width: 1536, height: 1024 },
  portrait: { size: "1024x1536", width: 1024, height: 1536 },
};

export function imagesAvailable() {
  return capabilities.openai;
}

export const assetKey = (projectId: string, file: string) => `assets/${projectId}/${file}`;
export const assetUrl = (projectId: string, file: string) => `${env.APP_URL.replace(/\/$/, "")}/api/assets/${projectId}/${file}`;

export async function generateProjectImage(input: { projectId: string; prompt: string; aspect: ImageAspect }): Promise<{ url: string; width: number; height: number }> {
  if (!env.OPENAI_API_KEY) throw new Error("Image generation is not configured (OPENAI_API_KEY is not set).");
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 120_000, maxRetries: 1 });
  const { size, width, height } = SIZES[input.aspect];
  const res = await client.images.generate({
    model: env.OPENAI_IMAGE_MODEL,
    // Photographic, brand-safe defaults: no text in the image (it renders badly and cannot be edited).
    prompt: `${input.prompt.trim()}\n\nStyle: professional, natural lighting, realistic, no text, no watermarks, no logos.`,
    size,
    quality: "medium",
    output_format: "webp",
    n: 1,
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("The image service returned no image.");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const file = `${crypto.randomUUID()}.webp`;
  await putBytes(assetKey(input.projectId, file), bytes, "image/webp");
  return { url: assetUrl(input.projectId, file), width, height };
}
