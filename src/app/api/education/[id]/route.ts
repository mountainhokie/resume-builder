import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { education, type NewEducation } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getAuthedProfile, notFound, unauthorized } from "@/lib/auth-helpers";
import { sanitizeBody } from "@/lib/api-guard";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const { id } = await params;
    const body = sanitizeBody<Partial<NewEducation>>(await request.json());
    const updated = await db
      .update(education)
      .set(body)
      .where(and(eq(education.id, id), eq(education.profileId, ctx.profile.id)))
      .returning();
    if (!updated.length) return notFound();
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating education:", error);
    return NextResponse.json(
      { error: "Failed to update education" },
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
      .delete(education)
      .where(and(eq(education.id, id), eq(education.profileId, ctx.profile.id)))
      .returning({ id: education.id });
    if (!deleted.length) return notFound();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting education:", error);
    return NextResponse.json(
      { error: "Failed to delete education" },
      { status: 500 }
    );
  }
}
