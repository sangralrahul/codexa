import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AuthError } from "@/lib/auth/guards";
import { RateLimitError } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, message: string, code = "error", details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what = "Resource") => new ApiError(404, `${what} not found`, "not_found");
export const forbidden = (msg = "You do not have permission to do that") => new ApiError(403, msg, "forbidden");
export const badRequest = (msg: string, details?: unknown) => new ApiError(400, msg, "bad_request", details);
export const conflict = (msg: string) => new ApiError(409, msg, "conflict");

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/** Parse a JSON body with a zod schema, raising a 400 with details on failure. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Invalid JSON body");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw badRequest("Validation failed", result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  return result.data;
}

/**
 * Wrap a route handler so thrown errors map to consistent JSON responses.
 * Usage: export const POST = handler(async (req) => { ... return json(...) })
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Browsers attach session cookies to same-site requests, and previews/hosted
 * sites run user code on sibling subdomains (same site as the app). So a
 * mutating request that carries a foreign Origin is rejected. Server-to-server
 * callers (webhooks, cron) send no Origin and are unaffected.
 */
export function crossOriginRejected(req: Request): boolean {
  if (SAFE_METHODS.has(req.method)) return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  if (origin === new URL(req.url).origin) return false;
  try {
    return origin !== new URL(env.APP_URL).origin;
  } catch {
    return true;
  }
}

export function handler<Ctx = unknown>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      if (crossOriginRejected(req)) throw forbidden("Cross-origin request rejected");
      return await fn(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: { code: err.code, message: err.message, details: err.details } }, { status: err.status });
  }
  if (err instanceof AuthError) {
    return NextResponse.json({ error: { code: err.status === 403 ? "forbidden" : "unauthorized", message: err.message } }, { status: err.status });
  }
  if (err instanceof RateLimitError) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: err.message, resetAt: err.resetAt.toISOString() } },
      { status: 429, headers: { "Retry-After": String(Math.ceil((err.resetAt.getTime() - Date.now()) / 1000)) } },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json({ error: { code: "bad_request", message: "Validation failed", details: err.issues } }, { status: 400 });
  }
  // Next.js redirect()/notFound() throw special errors that must propagate.
  if (err && typeof err === "object" && "digest" in err && typeof (err as { digest: unknown }).digest === "string") {
    throw err;
  }
  logger.error("unhandled api error", { error: err instanceof Error ? err : String(err) });
  return NextResponse.json({ error: { code: "internal", message: "Something went wrong" } }, { status: 500 });
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  return xf?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
