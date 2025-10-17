// src/types/next-auth.d.ts
import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  /** Your session.user always includes a string id */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"]; // name?: string | null; email?: string | null; image?: string | null
  }

  /** If you rely on a user id coming from your provider/db */
  interface User extends DefaultUser {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    picture?: string | null;
  }
}

/** Make this file a module to avoid global augmentation issues */
export {};
