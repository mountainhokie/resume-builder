import { NextResponse } from "next/server";
import { lt } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { extAuthCodes } from "@/lib/schema";
import {
  AUTH_CODE_TTL_SECONDS,
  generateOpaqueToken,
  hashToken,
} from "@/lib/ext-tokens";
import { isAllowedExtensionRedirect } from "@/lib/ext-cors";

/**
 * Start of the extension sign-in handoff.
 *
 * The extension opens this in chrome.identity.launchWebAuthFlow. If there is no
 * session yet the user is sent to the normal sign-in page and lands back here
 * afterwards, so provider credentials stay entirely server-side and the
 * extension never sees them.
 *
 * Responds with a redirect rather than JSON because launchWebAuthFlow completes
 * by observing navigation to the extension's chromiumapp.org URL.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const codeChallenge = url.searchParams.get("code_challenge") ?? "";
  const method = url.searchParams.get("code_challenge_method") ?? "S256";
  const state = url.searchParams.get("state") ?? "";

  if (!isAllowedExtensionRedirect(redirectUri)) {
    return NextResponse.json(
      { error: "invalid_redirect_uri" },
      { status: 400 }
    );
  }
  if (!codeChallenge) {
    return NextResponse.json(
      { error: "code_challenge is required" },
      { status: 400 }
    );
  }
  if (method !== "S256" && method !== "plain") {
    return NextResponse.json(
      { error: "unsupported code_challenge_method" },
      { status: 400 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    // Bounce through sign-in, then return to this exact URL.
    const signIn = new URL("/signin", url.origin);
    signIn.searchParams.set("callbackUrl", url.pathname + url.search);
    return NextResponse.redirect(signIn);
  }

  // Opportunistic sweep so consumed and expired codes do not accumulate.
  await db.delete(extAuthCodes).where(lt(extAuthCodes.expiresAt, new Date()));

  const code = generateOpaqueToken();
  await db.insert(extAuthCodes).values({
    userId: session.user.id,
    codeHash: hashToken(code),
    codeChallenge,
    codeChallengeMethod: method,
    redirectUri,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
  });

  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  if (state) target.searchParams.set("state", state);
  return NextResponse.redirect(target);
}
