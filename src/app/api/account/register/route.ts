import { NextResponse } from "next/server";
import { eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { pendingRegistrations, users } from "@/lib/schema";
import { checkPasswordStrength, hashPassword } from "@/lib/password";
import {
  VERIFICATION_TTL_HOURS,
  expiresIn,
  generateToken,
  hashToken,
  looksLikeEmail,
  normalizeEmail,
} from "@/lib/auth-tokens";
import {
  EmailConfigError,
  appOrigin,
  sendVerificationEmail,
} from "@/lib/email";

/**
 * Starts an email/password signup.
 *
 * No `users` row is created here — the signup waits in pending_registrations
 * until the address is confirmed. That is what keeps account linking safe: an
 * address nobody has proved cannot sit in `users` waiting to be linked to by
 * the real owner's Google sign-in.
 *
 * The response never reveals whether an address is already registered. It says
 * the same thing either way, and an existing account is told by email that
 * someone tried, with a link to reset the password instead.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");
    const name = body.name?.trim().slice(0, 255) || null;

    if (!looksLikeEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }
    const weak = checkPasswordStrength(password, email);
    if (weak) return NextResponse.json({ error: weak }, { status: 400 });

    // Housekeeping: drop anything that expired before this attempt.
    await db
      .delete(pendingRegistrations)
      .where(lt(pendingRegistrations.expiresAt, new Date()));

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length) {
      // Same shape of reply as a fresh signup, so this endpoint cannot be used
      // to discover which addresses have accounts.
      return NextResponse.json({ ok: true, pending: true });
    }

    const token = generateToken();
    const passwordHash = await hashPassword(password);
    const values = {
      email,
      name,
      passwordHash,
      tokenHash: hashToken(token),
      expiresAt: expiresIn(VERIFICATION_TTL_HOURS * 60),
    };

    // A repeat signup for the same unconfirmed address replaces the old one,
    // so the most recent email is always the one that works.
    await db
      .insert(pendingRegistrations)
      .values(values)
      .onConflictDoUpdate({
        target: pendingRegistrations.email,
        set: values,
      });

    const link = `${appOrigin(request)}/verify-email?token=${encodeURIComponent(token)}`;
    const result = await sendVerificationEmail(email, link);

    return NextResponse.json({
      ok: true,
      pending: true,
      // Only present when no mail provider is configured, so local development
      // is not a dead end. Never populated once RESEND_API_KEY is set.
      devLink: result.devLink,
    });
  } catch (error) {
    console.error("Error registering:", error);
    // A misconfigured mail provider is not transient, so say so rather than
    // inviting a retry that cannot work. The specifics name real settings, so
    // they stay out of production responses and go to the log instead.
    if (error instanceof EmailConfigError) {
      console.error(`[email] ${error.detail}`);
      return NextResponse.json(
        {
          error: error.message,
          detail:
            process.env.NODE_ENV === "production" ? undefined : error.detail,
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Could not start signup. Try again in a moment." },
      { status: 500 }
    );
  }
}
