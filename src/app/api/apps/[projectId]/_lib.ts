import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, clientIp, errorResponse, parseBody } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import { CLOUD_LIMITS, appUserFromToken, getCloudProject, type PublicAppUser } from "@/lib/services/cloud";

/*
 * Public Codexa Cloud API, called from users' apps in the browser (any origin).
 * Auth is a bearer token, never cookies, so allowing every origin is safe: a page
 * can only act with a token it already holds. Responses: { data } or { error: { code, message } }.
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
};

function withCors(res: Response): Response {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status });
}

/** OPTIONS preflight for every app route. */
export async function preflight() {
  return withCors(new Response(null, { status: 204 }));
}

export function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  const m = h?.match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : null;
}

export type AppCtx<P> = {
  projectId: string;
  params: P;
  ip: string;
  token: string | null;
  /** The signed-in app user (from the bearer token), or null. */
  actor: () => Promise<PublicAppUser | null>;
};

/** General per-IP budget for an app's API; sign-in/sign-up add stricter limits of their own. */
const API_LIMIT = 300;

export function appRoute<P extends { projectId: string }>(fn: (req: Request, c: AppCtx<P>) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      const params = await ctx.params;
      const project = await getCloudProject(params.projectId);
      const ip = clientIp(req);
      await enforceRateLimit(`cloud:api:${project.id}:${ip}`, API_LIMIT, 60_000);
      const token = bearerToken(req);
      let actor: Promise<PublicAppUser | null> | null = null;
      return withCors(
        await fn(req, {
          projectId: project.id,
          params,
          ip,
          token,
          actor: () => (actor ??= appUserFromToken(project.id, token)),
        }),
      );
    } catch (err) {
      return withCors(errorResponse(err));
    }
  };
}

const recordBody = z.record(z.string().max(64), z.unknown());

/** A record body: a JSON object (size is checked again, exactly, by the service). */
export async function parseRecordBody(req: Request) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 4 * CLOUD_LIMITS.maxRecordBytes) throw new ApiError(413, `Record exceeds ${CLOUD_LIMITS.maxRecordBytes} bytes`, "too_large");
  return parseBody(req, recordBody);
}
