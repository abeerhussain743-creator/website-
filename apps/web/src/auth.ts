import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@postpilot/db";
import { z } from "zod";

const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "true" &&
  process.env.NODE_ENV !== "production";

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (process.env.RESEND_API_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "PostPilot <onboarding@localhost>",
    }),
  );
} else if (process.env.NODE_ENV !== "production") {
  // Dev magic-link: log URL to console instead of sending email
  providers.push(
    Resend({
      apiKey: "re_dev_placeholder",
      from: process.env.AUTH_EMAIL_FROM ?? "PostPilot <onboarding@localhost>",
      sendVerificationRequest: async ({ identifier, url }) => {
        console.info("\n[PostPilot Auth] Magic link for", identifier);
        console.info(url, "\n");
      },
    }),
  );
}

if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      authorize: async (credentials) => {
        const parsed = z
          .object({
            email: z.string().email(),
            name: z.string().min(1).max(80).optional(),
          })
          .safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.upsert({
          where: { email },
          update: {
            name: parsed.data.name ?? undefined,
            emailVerified: new Date(),
          },
          create: {
            email,
            name: parsed.data.name ?? email.split("@")[0],
            emailVerified: new Date(),
          },
        });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  );
}

const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: devLoginEnabled ? "jwt" : "database",
  },
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/check-email",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token, user }) {
      const id = user?.id ?? token.sub;
      if (session.user && id) {
        session.user.id = id;
      }
      return session;
    },
  },
  trustHost: true,
});

export const handlers = nextAuth.handlers;
export const auth = nextAuth.auth;
// Explicit aliases avoid TS2742 portable type errors with Auth.js providers.
export const signIn: typeof nextAuth.signIn = nextAuth.signIn;
export const signOut: typeof nextAuth.signOut = nextAuth.signOut;
