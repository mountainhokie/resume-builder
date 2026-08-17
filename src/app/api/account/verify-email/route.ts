import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pendingRegistrations, users } from "@/lib/schema";
import { hashToken, isExpired } from "@/lib/auth-tokens";

/**
 * Completes a signup: proves the address, then creates the user.
 *
 * This is the only path that turns a password signup into a `users` row, which
 * is what lets OAuth providers link by email safely — every address in `users`
 * has been proved by either this endpoint or the provider itself.
 */
export async function POST(request: Request) {
  try {
    const { token } = (await request.json()) as { token?: string };
    if (!token) {
      return NextResponse.json({ error: "Missing token." }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.tokenHash, hashToken(token)))
      .limit(1);
    const pending = rows[0];

    if (!pending) {
      return NextResponse.json(
        {
          error:
            "That confirmation link is not valid. It may already have been " +
            "used — try signing in.",
        },
        { status: 400 }
      );
    }
    if (isExpired(pending.expiresAt)) {
      await db
        .delete(pendingRegistrations)
        .where(eq(pendingRegistrations.id, pending.id));
      return NextResponse.json(
        { error: "That confirmation link has expired. Sign up again." },
        { status: 400 }
      );
    }

    // Someone may have signed in with an OAuth provider using this address
    // while the confirmation sat unopened. Adopt that account rather than
    // failing on the unique constraint, since the address is proved either way.
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, pending.email))
      .limit(1);

    if (existing.length) {
      await db
        .update(users)
        .set({
          passwordHash: pending.passwordHash,
          emailVerified: existing[0].emailVerified ?? new Date(),
        })
        .where(eq(users.id, existing[0].id));
    } else {
      await db.insert(users).values({
        email: pending.email,
        name: pending.name,
        passwordHash: pending.passwordHash,
        emailVerified: new Date(),
      });
    }

    await db
      .delete(pendingRegistrations)
      .where(eq(pendingRegistrations.id, pending.id));

    return NextResponse.json({ ok: true, email: pending.email });
  } catch (error) {
    console.error("Error verifying email:", error);
    return NextResponse.json(
      { error: "Could not confirm that link. Try again in a moment." },
      { status: 500 }
    );
  }
}
