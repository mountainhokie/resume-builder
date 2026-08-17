import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profiles, applicationAnswers, type Profile } from "@/lib/schema";
import { DEFAULT_ANSWER_SEEDS } from "@/lib/application-answers";
import { verifyExtAccessToken } from "@/lib/ext-tokens";

export type AuthedContext = { userId: string; profile: Profile };

/**
 * Resolves the caller's profile from either a browser session cookie or an
 * extension Bearer token. Every API route must go through this instead of
 * trusting a caller-supplied profileId.
 *
 * Pass `request` on routes the extension can reach so the Bearer path works.
 */
export async function getAuthedProfile(
  request?: Request
): Promise<AuthedContext | null> {
  let userId: string | null = null;
  let email: string | null = null;
  let name: string | null = null;

  const header = request?.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const claims = await verifyExtAccessToken(header.slice(7).trim());
    if (claims) userId = claims.sub;
  }

  if (!userId) {
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
      email = session.user.email ?? null;
      name = session.user.name ?? null;
    }
  }

  if (!userId) return null;

  const profile = await getOrCreateProfile(userId, email, name);
  return { userId, profile };
}

/**
 * One profile per user, created on demand.
 *
 * A profile row with no user_id predates authentication. It is claimed by the
 * first user whose verified provider email matches it — which is how the
 * original single-user data survives the migration. All three providers verify
 * email addresses, so this cannot be claimed by an unverified address.
 */
export async function getOrCreateProfile(
  userId: string,
  email?: string | null,
  name?: string | null
): Promise<Profile> {
  const existing = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  if (existing.length) return existing[0];

  if (email) {
    const orphan = await db
      .select()
      .from(profiles)
      .where(and(isNull(profiles.userId), eq(profiles.email, email)))
      .limit(1);
    if (orphan.length) {
      const claimed = await db
        .update(profiles)
        .set({ userId, updatedAt: new Date() })
        .where(eq(profiles.id, orphan[0].id))
        .returning();
      return claimed[0];
    }
  }

  const [firstName, ...rest] = (name ?? "").trim().split(/\s+/);
  const created = await db
    .insert(profiles)
    .values({
      userId,
      firstName: firstName || "First",
      lastName: rest.join(" ") || "Last",
      email: email ?? "",
    })
    .returning();

  await seedApplicationAnswers(created[0].id);
  return created[0];
}

/** Populates the answer library for a brand-new profile. */
export async function seedApplicationAnswers(profileId: string) {
  const rows = DEFAULT_ANSWER_SEEDS.map((seed, index) => ({
    profileId,
    key: seed.key,
    label: seed.label,
    valueType: seed.valueType,
    synonyms: seed.synonyms,
    isSensitive: seed.isSensitive ?? false,
    sortOrder: index,
  }));
  if (!rows.length) return;
  await db.insert(applicationAnswers).values(rows).onConflictDoNothing();
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
