import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Redirects unauthenticated visitors to the sign-in page.
 *
 * This only checks for the presence of a session cookie — it does not validate
 * it. Real enforcement lives in the API routes via getAuthedProfile(), which is
 * what actually guards the data; this is purely so signed-out visitors land on
 * a sign-in screen instead of an empty dashboard.
 */
// /api/ext is exempt wholesale: those routes authenticate themselves through
// getAuthedProfile() and must answer with a JSON 401 rather than an HTML
// redirect the extension cannot act on.
const PUBLIC_PATHS = [
  "/signin",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/api/auth",
  "/api/ext",
  // Registration, verification and password reset all run before a session
  // exists, so they cannot sit behind the session check.
  "/api/account/register",
  "/api/account/verify-email",
  "/api/account/forgot-password",
  "/api/account/reset-password",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS preflights deliberately carry neither cookies nor Authorization —
  // redirecting them would fail the check before the real request is ever sent.
  if (request.method === "OPTIONS") return NextResponse.next();

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  // The extension authenticates with a Bearer token instead of a cookie.
  const hasBearer = request.headers
    .get("authorization")
    ?.startsWith("Bearer ");

  if (!hasSession && !hasBearer) {
    const signInUrl = new URL("/signin", request.url);
    if (pathname !== "/") signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.png$).*)",
  ],
};
