import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import {
  checkPasswordStrength,
  hashPassword,
  verifyPassword,
} from "@/lib/password";

/** Whether the signed-in account already has a password, for the Settings UI. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db
    .select({ passwordHash: users.passwordHash, email: users.email })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  return NextResponse.json({
    hasPassword: Boolean(rows[0]?.passwordHash),
    email: rows[0]?.email ?? null,
  });
}

/**
 * Sets or changes the password for the signed-in account.
 *
 * Changing an existing password requires the current one, so a borrowed
 * session cannot lock the real owner out. Setting a first password does not —
 * the address was already proved by whichever provider signed them in.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, password } = (await request.json()) as {
      currentPassword?: string;
      password?: string;
    };

    const rows = await db
      .select({ passwordHash: users.passwordHash, email: users.email })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    const account = rows[0];
    if (!account) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (account.passwordHash) {
      const ok = await verifyPassword(
        String(currentPassword ?? ""),
        account.passwordHash
      );
      if (!ok) {
        return NextResponse.json(
          { error: "That is not your current password." },
          { status: 400 }
        );
      }
    }

    const weak = checkPasswordStrength(String(password ?? ""), account.email);
    if (weak) return NextResponse.json({ error: weak }, { status: 400 });

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(String(password)) })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ ok: true, hasPassword: true });
  } catch (error) {
    console.error("Error setting password:", error);
    return NextResponse.json(
      { error: "Could not update your password. Try again in a moment." },
      { status: 500 }
    );
  }
}
