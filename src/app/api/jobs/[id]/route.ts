import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, type NewJob } from "@/lib/schema";
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
    const body = sanitizeBody<Partial<NewJob>>(await request.json());
    // Ownership is part of the WHERE clause, so a foreign id matches nothing
    // and falls through to 404 rather than updating another account's row.
    const updated = await db
      .update(jobs)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(jobs.id, id), eq(jobs.profileId, ctx.profile.id)))
      .returning();
    if (!updated.length) return notFound();
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
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
      .delete(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.profileId, ctx.profile.id)))
      .returning({ id: jobs.id });
    if (!deleted.length) return notFound();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
