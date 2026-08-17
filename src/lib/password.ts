import bcrypt from "bcryptjs";

/**
 * Password hashing.
 *
 * bcryptjs rather than native bcrypt: it is pure JavaScript, so there is no
 * compilation step to go wrong on Windows or in a Vercel build.
 */

const COST = 12;

export const MIN_PASSWORD_LENGTH = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

/**
 * Always runs a real comparison, even when the account has no password.
 *
 * Returning early for a missing hash would make a sign-in attempt against an
 * OAuth-only account measurably faster than one against a password account,
 * which tells an attacker which addresses have passwords set.
 */
const DUMMY_HASH = bcrypt.hashSync("password-that-is-never-valid", COST);

export function verifyPassword(
  plain: string,
  hash: string | null
): Promise<boolean> {
  if (!hash) {
    return bcrypt.compare(plain, DUMMY_HASH).then(() => false);
  }
  return bcrypt.compare(plain, hash);
}

/**
 * Length is the only rule worth enforcing. Composition rules push people
 * toward predictable substitutions without adding much real strength, so the
 * checks here are for the two mistakes that genuinely matter: something short,
 * and something that is just the email address.
 */
export function checkPasswordStrength(
  password: string,
  email?: string
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) {
    return "That password is too long.";
  }
  const normalized = password.trim().toLowerCase();
  if (email && normalized === email.trim().toLowerCase()) {
    return "Your password cannot be your email address.";
  }
  if (/^(.)\1+$/.test(password)) {
    return "Use something less predictable than a single repeated character.";
  }
  return null;
}
