import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      hasIssuer: boolean;
    } & DefaultSession["user"];
  }
}
