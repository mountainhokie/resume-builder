import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/schema";
import { checkPasswordStrength, hashPassword } from "@/lib/password";
import { hashToken, isExpired } from "@/lib/auth-tokens";

/** Consumes a reset link and sets the new password. */
export async function POST(request: Request) {
  try {
    const { token, password } = (await request.json()) as {
      token?: string;
      password?: string;
    };
    if (!token || !password) {
      return NextResponse.json(
        { error: "Missing token or password." },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(token)),
          isNull(passwordResetTokens.consumedAt)
        )
      )
      .limit(1);
    const record = rows[0];

    if (!record || isExpired(record.expiresAt)) {
      return NextResponse.json(
        {
          error:
            "That reset link is no longer valid. Request a new one and use " +
            "the most recent email.",
        },
        { status: 400 }
      );
    }

    const account = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, record.userId))
      .limit(1);

    const weak = checkPasswordStrength(password, account[0]?.email);
    if (weak) return NextResponse.json({ error: weak }, { status: 400 });

    // Burn the token first, conditioned on it still being unused, so two
    // submissions of the same link cannot both go through.
    const consumed = await db
      .update(passwordResetTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.id, record.id),
          isNull(passwordResetTokens.consumedAt)
        )
      )
      .returning({ id: passwordResetTokens.id });
    if (!consumed.length) {
      return NextResponse.json(
        { error: "That reset link has already been used." },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password) })
      .where(eq(users.id, record.userId));

    // Any other outstanding links for this account are now stale.
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, record.userId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Could not reset that password. Try again in a moment." },
      { status: 500 }
    );
  }
}
