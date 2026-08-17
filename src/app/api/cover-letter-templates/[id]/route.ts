import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coverLetterTemplates } from "@/lib/schema";
import { getAuthedProfile, notFound, unauthorized } from "@/lib/auth-helpers";
import { clearDefaultTemplate } from "@/lib/cover-letter-templates";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      opening?: string;
      body?: string;
      closing?: string;
      isDefault?: boolean;
    };

    if (body.isDefault) await clearDefaultTemplate(ctx.profile.id, id);

    const updated = await db
      .update(coverLetterTemplates)
      .set({
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.opening !== undefined ? { opening: body.opening } : {}),
        ...(body.body !== undefined ? { body: body.body } : {}),
        ...(body.closing !== undefined ? { closing: body.closing } : {}),
        ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(coverLetterTemplates.id, id),
          eq(coverLetterTemplates.profileId, ctx.profile.id)
        )
      )
      .returning();
    if (!updated.length) return notFound();
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating cover letter template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
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
      .delete(coverLetterTemplates)
      .where(
        and(
          eq(coverLetterTemplates.id, id),
          eq(coverLetterTemplates.profileId, ctx.profile.id)
        )
      )
      .returning({ id: coverLetterTemplates.id });
    if (!deleted.length) return notFound();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cover letter template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
