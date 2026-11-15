import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge gate: bounces visitors without a session cookie away from private areas.
 * This is only a UX convenience — every page, action and route re-checks
 * the session and role on the server.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get("sid")?.value);
  if (!hasSession && (pathname.startsWith("/admin") || pathname.startsWith("/dashboard"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  if (pathname.startsWith("/gallery") || pathname.startsWith("/guest") || pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/gallery/:path*", "/guest/:path*"],
};
