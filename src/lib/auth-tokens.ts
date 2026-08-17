import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Single-use tokens for email verification and password reset.
 *
 * Only the SHA-256 hash is stored, so read access to the database does not
 * hand over working links. The tokens are high-entropy random values rather
 * than anything derived from the user, so a plain hash is enough — there is
 * nothing to brute-force back.
 */

export const VERIFICATION_TTL_HOURS = 24;
export const RESET_TTL_MINUTES = 60;

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time compare, for the rare paths that check a hash in JS. */
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function expiresIn(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function isExpired(at: Date): boolean {
  return at.getTime() < Date.now();
}

export function normalizeEmail(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/** Deliberately permissive: the confirmation email is the real check. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 255;
}
