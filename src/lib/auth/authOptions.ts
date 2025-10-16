import AzureADProvider from "next-auth/providers/azure-ad";
import type { AuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import { AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID, AUTH_COOKIE_DOMAIN, AUTH_COOKIE_NAME, NEXTAUTH_SECRET } from "@/config/env";

export const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: AZURE_AD_CLIENT_ID,
      clientSecret: AZURE_AD_CLIENT_SECRET,
      tenantId: AZURE_AD_TENANT_ID,
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // 7 days
  jwt: { secret: NEXTAUTH_SECRET },
  cookies: {
    // The one cookie all apps will share
    sessionToken: {
      name: AUTH_COOKIE_NAME,
      options: {
        domain: AUTH_COOKIE_DOMAIN,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      },
    },
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.userId = user?.id ?? token.sub ?? undefined;
        token.email = user?.email ?? token.email;
        token.name = user?.name ?? token.name;
        token.picture = token.picture ?? null; // keep nullable
      }
      return token;
    },
    async session({ session, token }) {
      const id = (typeof (token as JWT & { userId?: string }).userId === "string" && (token as JWT & { userId?: string }).userId) || (typeof token.sub === "string" ? token.sub : "");

      session.user = {
        ...(session.user ?? {}),
        id,
        email: (token.email as string | null | undefined) ?? session.user?.email ?? null,
        name: (token.name as string | null | undefined) ?? session.user?.name ?? null,
        image: (token.picture as string | null | undefined) ?? session.user?.image ?? null,
      };

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("http")) return url;
      return new URL(url, baseUrl).toString();
    },
  },
};
