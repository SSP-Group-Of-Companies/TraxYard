// src/lib/utils/auth/authUtils.ts
import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import type { IUser } from "@/types/user.types";
import { AppError } from "@/lib/utils/apiResponse";
import { DISABLE_AUTH } from "@/config/env";
import { authOptions } from "@/lib/auth/authOptions";

/** Memoized per-request: fetch the NextAuth session. */
export const currentSession = cache(async () => getServerSession(authOptions));

/** Return the current authenticated user as IUser, or null if unauthenticated. */
export const currentUser = cache(async (): Promise<IUser | null> => {
  const session = await currentSession();
  const u = session?.user; // typed via module augmentation (always has id if session exists)
  if (!u?.id) return null;

  return {
    id: u.id,
    email: u.email ?? null,
    name: u.name ?? null,
    picture: u.image ?? null,
  };
});

/**
 * Guard: ensure a user is authenticated.
 * - If DISABLE_AUTH is true, returns null (bypass).
 * - Otherwise, throws 401 if no valid user.
 * - Returns IUser when authenticated.
 */
export const guard = cache(async (): Promise<IUser | null> => {
  if (DISABLE_AUTH) return null;
  const user = await currentUser();
  if (!user) throw new AppError(401, "Unauthenticated");
  return user;
});

/** Convenience: get just the authenticated user's id, or null. */
export const currentUserId = cache(async (): Promise<string | null> => {
  const user = await currentUser();
  return user?.id ?? null;
});

/** Convenience: strict variant that throws if no user id. */
export const requireUserId = cache(async (): Promise<string> => {
  if (DISABLE_AUTH) return "dev-bypass";
  const id = await currentUserId();
  if (!id) throw new AppError(401, "Unauthenticated");
  return id;
});
