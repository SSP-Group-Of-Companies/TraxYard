import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, NEXTAUTH_SECRET, NEXT_PUBLIC_PORTAL_BASE_URL, DISABLE_AUTH } from "./config/env";
import { resolveOriginFromRequest } from "./lib/utils/urlHelper";

export async function middleware(req: NextRequest) {
  if (DISABLE_AUTH) return NextResponse.next();

  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isAuthPage = pathname === "/login"; // local guard login

  const token = await getToken({
    req,
    secret: NEXTAUTH_SECRET,
    cookieName: AUTH_COOKIE_NAME,
  });

  const publicOrigin = resolveOriginFromRequest(req);

  // ── Admin side (/dashboard): redirect to central portal with fixed callback
  if (isDashboard) {
    if (!token) {
      const callbackUrl = encodeURIComponent(`${publicOrigin}/dashboard/home`);
      const portalBase = (NEXT_PUBLIC_PORTAL_BASE_URL || "").replace(/\/$/, "");
      return NextResponse.redirect(`${portalBase}/login?callbackUrl=${callbackUrl}`);
    }
    return NextResponse.next();
  }

  // ── Guards side (everything else under /)
  if (!token && !isAuthPage) {
    const loginUrl = new URL("/login", publicOrigin);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/", publicOrigin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
};
