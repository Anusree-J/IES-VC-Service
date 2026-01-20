import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // If user is not authenticated and trying to access protected routes
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Check admin routes
    if (pathname.startsWith("/admin")) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) =>
        e.trim().toLowerCase()
      ) || [];

      if (!adminEmails.includes(token.email?.toLowerCase() || "")) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - login
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|api/test-connection|login|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
