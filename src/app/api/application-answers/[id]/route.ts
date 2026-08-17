import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { applicationAnswers, fieldMappings } from "@/lib/schema";
import { getAuthedProfile, notFound, unauthorized } from "@/lib/auth-helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const { id } = await params;
    const body = (await request.json()) as {
      label?: string;
      value?: string;
      valueType?: string;
      synonyms?: string[];
      isSensitive?: boolean;
    };

    const updated = await db
      .update(applicationAnswers)
      .set({
        ...(body.label !== undefined ? { label: body.label.trim() } : {}),
        ...(body.value !== undefined ? { value: body.value } : {}),
        ...(body.valueType !== undefined ? { valueType: body.valueType } : {}),
        ...(body.synonyms !== undefined ? { synonyms: body.synonyms } : {}),
        ...(body.isSensitive !== undefined
          ? { isSensitive: body.isSensitive }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(applicationAnswers.id, id),
          eq(applicationAnswers.profileId, ctx.profile.id)
        )
      )
      .returning();
    if (!updated.length) return notFound();
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating application answer:", error);
    return NextResponse.json(
      { error: "Failed to update answer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const { id } = await params;
    const deleted = await db
      .delete(applicationAnswers)
      .where(
        and(
          eq(applicationAnswers.id, id),
          eq(applicationAnswers.profileId, ctx.profile.id)
        )
      )
      .returning({ key: applicationAnswers.key });
    if (!deleted.length) return notFound();

    // Any field the user taught to point at this answer would now resolve to
    // nothing, so drop those mappings rather than leave them silently dead.
    await db
      .delete(fieldMappings)
      .where(
        and(
          eq(fieldMappings.profileId, ctx.profile.id),
          eq(fieldMappings.answerKey, deleted[0].key)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting application answer:", error);
    return NextResponse.json(
      { error: "Failed to delete answer" },
      { status: 500 }
    );
  }
}
