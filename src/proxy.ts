import { NextResponse, type NextRequest } from "next/server";

// Same name logic as src/lib/auth/session.ts (kept local so the proxy stays dependency-free).
const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-codexa_session" : "codexa_session";

/**
 * Lightweight optimistic checks only. Real authorization happens server-side
 * in page/route code via requireUser()/assertProjectAccess().
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const protectedPrefixes = ["/dashboard", "/projects", "/workspace", "/settings", "/admin", "/onboarding", "/new-project", "/import-project", "/connect-github"];
  if (!hasSession && protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (hasSession && (pathname === "/login" || pathname === "/signup")) {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  // Never index private app surfaces.
  if (protectedPrefixes.some((p) => pathname.startsWith(p)) || pathname.startsWith("/api/")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|monaco/|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|woff2?)$).*)"],
};
