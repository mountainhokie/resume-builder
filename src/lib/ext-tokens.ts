import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";

/**
 * Token handling for the Chrome extension.
 *
 * The extension holds a short-lived signed access token and a long-lived opaque
 * refresh token. Only the SHA-256 hash of the refresh token is persisted, so a
 * database leak does not yield usable credentials.
 */

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_DAYS = 60;
export const AUTH_CODE_TTL_SECONDS = 60;

const ISSUER = "resume-builder";
const AUDIENCE = "resume-builder-extension";

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error(
      "AUTH_SECRET is not set — required to sign extension access tokens."
    );
  }
  return new TextEncoder().encode(value);
}

export type ExtAccessClaims = { sub: string };

export async function signExtAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifyExtAccessToken(
  token: string
): Promise<ExtAccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload.sub ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}

export const accessTokenTtlSeconds = ACCESS_TOKEN_TTL_SECONDS;

/** Opaque, high-entropy token. Returned to the client exactly once. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * PKCE S256 verification. Guards the code exchange so an intercepted
 * authorization code is useless without the original verifier.
 */
export function verifyPkceChallenge(
  verifier: string,
  challenge: string,
  method: string
): boolean {
  if (method === "plain") return verifier === challenge;
  if (method !== "S256") return false;
  const computed = createHash("sha256").update(verifier).digest("base64url");
  // Length-independent compare is unnecessary here (challenge is public), but
  // keep it simple and constant-shaped.
  return computed === challenge;
}
