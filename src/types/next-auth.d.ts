// types/next-auth.d.ts
import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string; // if you rely on a user id coming from your provider/db
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    picture?: string | null;
  }
}

// Make this a module
export {};
