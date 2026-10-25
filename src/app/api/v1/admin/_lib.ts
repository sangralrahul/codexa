import { requireApiAdmin } from "@/lib/auth/guards";

export { requireApiAdmin };
export function q(req: Request) {
  const u = new URL(req.url);
  return {
    get: (k: string) => u.searchParams.get(k)?.trim() || undefined,
    page: () => Math.max(1, Number(u.searchParams.get("page") ?? 1) || 1),
  };
}
