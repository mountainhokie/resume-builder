import { NextResponse } from "next/server";
import { eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/schema";
import {
  RESET_TTL_MINUTES,
  expiresIn,
  generateToken,
  hashToken,
  looksLikeEmail,
  normalizeEmail,
} from "@/lib/auth-tokens";
import {
  EmailConfigError,
  appOrigin,
  sendPasswordResetEmail,
} from "@/lib/email";

/**
 * Sends a reset link.
 *
 * Works for accounts that have only ever used an OAuth provider too: receiving
 * the email proves the address, which is the same standard used to set a
 * password in the first place. That gives a Google-only user a way in when they
 * lose access to Google, rather than losing the account.
 *
 * Replies identically whether or not the address exists — otherwise this
 * becomes a way to enumerate who has an account.
 */
export async function POST(request: Request) {
  try {
    const { email: rawEmail } = (await request.json()) as { email?: string };
    const email = normalizeEmail(rawEmail);
    if (!looksLikeEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, new Date()));

    const found = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!found.length) return NextResponse.json({ ok: true });

    const token = generateToken();
    await db.insert(passwordResetTokens).values({
      userId: found[0].id,
      tokenHash: hashToken(token),
      expiresAt: expiresIn(RESET_TTL_MINUTES),
    });

    const link = `${appOrigin(request)}/reset-password?token=${encodeURIComponent(token)}`;
    const result = await sendPasswordResetEmail(email, link);

    return NextResponse.json({ ok: true, devLink: result.devLink });
  } catch (error) {
    console.error("Error starting password reset:", error);
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
      { error: "Could not send that email. Try again in a moment." },
      { status: 500 }
    );
  }
}
