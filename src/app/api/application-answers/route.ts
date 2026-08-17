import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicationAnswers } from "@/lib/schema";
import {
  getAuthedProfile,
  seedApplicationAnswers,
  unauthorized,
} from "@/lib/auth-helpers";
import { PROFILE_DERIVED_ANSWERS } from "@/lib/application-answers";
import type { Profile } from "@/lib/schema";

/**
 * The answer library.
 *
 * Identity fields (name, email, phone, links) are returned separately as
 * `derived` — they live on the profile and are shown read-only, so there is
 * only ever one copy of them to keep correct.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    let answers = await db
      .select()
      .from(applicationAnswers)
      .where(eq(applicationAnswers.profileId, ctx.profile.id))
      .orderBy(applicationAnswers.sortOrder, applicationAnswers.label);

    // Profiles that predate the answer library — including one claimed from
    // the pre-auth era — have never been seeded.
    if (!answers.length) {
      await seedApplicationAnswers(ctx.profile.id);
      answers = await db
        .select()
        .from(applicationAnswers)
        .where(eq(applicationAnswers.profileId, ctx.profile.id))
        .orderBy(applicationAnswers.sortOrder, applicationAnswers.label);
    }

    return NextResponse.json({ answers, derived: derivedFrom(ctx.profile) });
  } catch (error) {
    console.error("Error fetching application answers:", error);
    return NextResponse.json(
      { error: "Failed to fetch answers" },
      { status: 500 }
    );
  }
}

/** Adds a question the seeds do not cover — the "new field I just found" path. */
export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const body = (await request.json()) as {
      label?: string;
      value?: string;
      valueType?: string;
      synonyms?: string[];
      isSensitive?: boolean;
    };
    const label = body.label?.trim();
    if (!label) {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }

    const existing = await db
      .select({ key: applicationAnswers.key })
      .from(applicationAnswers)
      .where(eq(applicationAnswers.profileId, ctx.profile.id));
    const key = uniqueKey(label, new Set(existing.map((e) => e.key)));

    const saved = await db
      .insert(applicationAnswers)
      .values({
        profileId: ctx.profile.id,
        key,
        label,
        value: body.value ?? null,
        valueType: body.valueType ?? "text",
        synonyms: body.synonyms ?? [],
        isSensitive: body.isSensitive ?? false,
        sortOrder: 1000,
      })
      .returning();
    return NextResponse.json(saved[0]);
  } catch (error) {
    console.error("Error creating application answer:", error);
    return NextResponse.json(
      { error: "Failed to create answer" },
      { status: 500 }
    );
  }
}

/** Bulk value save, so editing the whole library is one request. */
export async function PUT(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const { updates } = (await request.json()) as {
      updates?: { id: string; value: string }[];
    };
    if (!updates?.length) return NextResponse.json({ updated: 0 });

    // Restrict to rows this profile owns before writing anything.
    const owned = await db
      .select({ id: applicationAnswers.id })
      .from(applicationAnswers)
      .where(
        and(
          eq(applicationAnswers.profileId, ctx.profile.id),
          inArray(
            applicationAnswers.id,
            updates.map((u) => u.id)
          )
        )
      );
    const ownedIds = new Set(owned.map((o) => o.id));

    let updated = 0;
    for (const update of updates) {
      if (!ownedIds.has(update.id)) continue;
      await db
        .update(applicationAnswers)
        .set({ value: update.value, updatedAt: new Date() })
        .where(eq(applicationAnswers.id, update.id));
      updated++;
    }
    return NextResponse.json({ updated });
  } catch (error) {
    console.error("Error saving application answers:", error);
    return NextResponse.json(
      { error: "Failed to save answers" },
      { status: 500 }
    );
  }
}

function derivedFrom(profile: Profile) {
  const values: Record<string, string> = {
    first_name: profile.firstName ?? "",
    last_name: profile.lastName ?? "",
    full_name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
    linkedin: profile.linkedin ?? "",
    github: profile.github ?? "",
    portfolio: profile.portfolio ?? "",
  };
  return PROFILE_DERIVED_ANSWERS.map((seed) => ({
    key: seed.key,
    label: seed.label,
    value: values[seed.key] ?? "",
  }));
}

function uniqueKey(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "custom";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
