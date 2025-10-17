import { AUTH_COOKIE_DOMAIN, AUTH_COOKIE_NAME } from "@/config/env";
import { resolveBaseUrl } from "@/lib/utils/urlHelper.server";
import { NextResponse } from "next/server";

const LOGIN_PATH = "/login";

function buildDeleteHeaders() {
  const names = [
    AUTH_COOKIE_NAME,
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
  ];

  const shared = `Domain=${AUTH_COOKIE_DOMAIN}; Path=/; Max-Age=0; SameSite=Lax; Secure`;
  const hostOnly = `Path=/; Max-Age=0; SameSite=Lax; Secure`;

  const headers: string[] = [];
  for (const n of names) {
    headers.push(`${n}=; ${shared}`);
    headers.push(`${n}=; ${hostOnly}`);
  }
  return headers;
}

export async function GET() {
  // Always trust PUBLIC_ORIGIN
  const origin = await resolveBaseUrl();
  const redirectTo = `${origin}${LOGIN_PATH}`;

  const res = NextResponse.redirect(redirectTo, { status: 303 });

  for (const v of buildDeleteHeaders()) {
    res.headers.append("Set-Cookie", v);
  }

  return res;
}
