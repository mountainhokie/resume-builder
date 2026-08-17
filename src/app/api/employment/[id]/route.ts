import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employment, type NewEmployment } from "@/lib/schema";
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
    const body = sanitizeBody<Partial<NewEmployment>>(await request.json());
    const updated = await db
      .update(employment)
      .set(body)
      .where(
        and(eq(employment.id, id), eq(employment.profileId, ctx.profile.id))
      )
      .returning();
    if (!updated.length) return notFound();
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating employment:", error);
    return NextResponse.json(
      { error: "Failed to update employment" },
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
      .delete(employment)
      .where(
        and(eq(employment.id, id), eq(employment.profileId, ctx.profile.id))
      )
      .returning({ id: employment.id });
    if (!deleted.length) return notFound();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employment:", error);
    return NextResponse.json(
      { error: "Failed to delete employment" },
      { status: 500 }
    );
  }
}
