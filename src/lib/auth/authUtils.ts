// src/lib/utils/auth/authUtils.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { IUser } from "@/types/user.types";
import { AppError } from "@/lib/utils/apiResponse";
import { AUTH_COOKIE_NAME, DISABLE_AUTH, NEXTAUTH_SECRET } from "@/config/env";

interface AppJWT {
  userId?: string;
  email?: string;
  name?: string;
  picture?: string;
  // roles?: string[];
}

/**
 * Builds a minimal NextRequest carrying the cookie header,
 * so `getToken` can correctly parse the session token in App Router.
 */
async function buildNextRequest(): Promise<NextRequest> {
  const jar = await cookies();
  const cookieHeader = jar
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  const headers = new Headers();
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return new NextRequest("https://internal.local/", { headers });
}

/**
 * Returns the currently authenticated user from the session token.
 * - Reads cookies via `cookies()`
 * - Uses `getToken` from NextAuth to verify/decode the JWT
 * - Returns a strongly typed `IUser` object or `null`
 */
export const currentUser = cache(async (): Promise<IUser | null> => {
  const jar = await cookies();
  const raw = jar.get(AUTH_COOKIE_NAME)?.value;
  if (!raw) return null;

  const req = await buildNextRequest();
  const token = (await getToken({
    req,
    secret: NEXTAUTH_SECRET,
    cookieName: AUTH_COOKIE_NAME,
  })) as AppJWT | null;

  if (!token?.userId || !token?.email || !token?.name) return null;
  const user = {
    id: token.userId,
    email: token.email,
    name: token.name,
    picture: token.picture,
  };
  return user;
});

/**
 * Guard method: ensures a user is authenticated.
 * - Calls `currentUser`
 * - Throws `AppError(401)` if no valid user is found
 * - returns null user if DISABLE_AUTH env is set to true
 */
export const guard = cache(async (): Promise<IUser | null> => {
  if (DISABLE_AUTH) return null;
  const user = await currentUser();
  if (!user) throw new AppError(401, "Unauthenticated");
  return user;
});
