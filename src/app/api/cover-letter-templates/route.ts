import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coverLetterTemplates } from "@/lib/schema";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";
import { clearDefaultTemplate } from "@/lib/cover-letter-templates";

export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const items = await db
      .select()
      .from(coverLetterTemplates)
      .where(eq(coverLetterTemplates.profileId, ctx.profile.id))
      .orderBy(desc(coverLetterTemplates.isDefault), coverLetterTemplates.name);
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching cover letter templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const body = (await request.json()) as {
      name?: string;
      opening?: string;
      body?: string;
      closing?: string;
      isDefault?: boolean;
    };
    const name = body.name?.trim() || "Default";

    // Only one row per profile may carry is_default, enforced by a partial
    // unique index — clear the incumbent before claiming it.
    if (body.isDefault) await clearDefaultTemplate(ctx.profile.id);

    const saved = await db
      .insert(coverLetterTemplates)
      .values({
        profileId: ctx.profile.id,
        name,
        opening: body.opening ?? null,
        body: body.body ?? null,
        closing: body.closing ?? null,
        isDefault: body.isDefault ?? false,
      })
      .onConflictDoUpdate({
        target: [coverLetterTemplates.profileId, coverLetterTemplates.name],
        set: {
          opening: body.opening ?? null,
          body: body.body ?? null,
          closing: body.closing ?? null,
          isDefault: body.isDefault ?? false,
          updatedAt: new Date(),
        },
      })
      .returning();
    return NextResponse.json(saved[0]);
  } catch (error) {
    console.error("Error saving cover letter template:", error);
    return NextResponse.json(
      { error: "Failed to save template" },
      { status: 500 }
    );
  }
}
