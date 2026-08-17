import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import LinkedIn from "next-auth/providers/linkedin";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/schema";
import { verifyPassword } from "@/lib/password";

/**
 * The web app is the single identity surface. The Chrome extension never talks
 * to Google/GitHub/LinkedIn directly — it goes through /api/ext/auth/*, which
 * relies on the session established here. Adding a fourth provider is therefore
 * a change to this file alone and needs no extension release.
 */
const providers = [
  ...(process.env.AUTH_GOOGLE_ID
    ? [Google({ allowDangerousEmailAccountLinking: true })]
    : []),
  ...(process.env.AUTH_GITHUB_ID
    ? [GitHub({ allowDangerousEmailAccountLinking: true })]
    : []),
  ...(process.env.AUTH_LINKEDIN_ID
    ? [LinkedIn({ allowDangerousEmailAccountLinking: true })]
    : []),
  Credentials({
    id: "password",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(raw) {
      const email = String(raw?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(raw?.password ?? "");
      if (!email || !password) return null;

      const found = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      const user = found[0];

      // verifyPassword compares against a dummy hash when the account has no
      // password, so an OAuth-only address takes the same time as a wrong
      // password and cannot be distinguished by timing.
      const ok = await verifyPassword(password, user?.passwordHash ?? null);
      if (!user || !ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

/** Provider ids configured in this environment, for rendering the sign-in page. */
export const enabledProviders = {
  google: Boolean(process.env.AUTH_GOOGLE_ID),
  github: Boolean(process.env.AUTH_GITHUB_ID),
  linkedin: Boolean(process.env.AUTH_LINKEDIN_ID),
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  /**
   * JWT rather than database sessions, because the Credentials provider
   * requires it: its branch of the callback route always issues a JWT cookie
   * and never calls adapter.createSession, so a database strategy would leave
   * a password sign-in looking signed out. The sessions table stays in place
   * but is no longer consulted.
   *
   * allowDangerousEmailAccountLinking above is safe alongside this because no
   * user row exists until its address is verified — password signups wait in
   * pending_registrations, and OAuth addresses are verified by the provider.
   */
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on the request that establishes the session.
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
