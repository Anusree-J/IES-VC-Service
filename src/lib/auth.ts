import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import type { Adapter } from "next-auth/adapters";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Check if user email is in the allowed list
      if (!user.email) {
        return false;
      }

      // Check if user is an admin (bypass allowed list)
      const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) =>
        e.trim().toLowerCase()
      ) || [];

      if (adminEmails.includes(user.email.toLowerCase())) {
        return true;
      }

      // Check if user is in the allowed users list
      const allowedUser = await prisma.allowedUser.findUnique({
        where: { email: user.email.toLowerCase() },
      });

      if (!allowedUser) {
        // User not in allowed list
        return false;
      }

      return true;
    },
    async jwt({ token, user }) {
      // On initial sign in, add user data to token
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;

        // Check if user is admin
        const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) =>
          e.trim().toLowerCase()
        ) || [];
        session.user.isAdmin = adminEmails.includes(
          session.user.email?.toLowerCase() || ""
        );

        // Check if user has an issuer set up
        const issuer = await prisma.issuer.findUnique({
          where: { userId: token.id as string },
        });
        session.user.hasIssuer = !!issuer;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",
};
