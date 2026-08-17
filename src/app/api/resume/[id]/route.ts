import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resumes, type NewResume } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getAuthedProfile, notFound, unauthorized } from "@/lib/auth-helpers";
import { ownsJob, sanitizeBody } from "@/lib/api-guard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const { id } = await params;
    const items = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.profileId, ctx.profile.id)));
    if (!items.length) return notFound();
    return NextResponse.json(items[0]);
  } catch (error) {
    console.error("Error fetching resume:", error);
    return NextResponse.json(
      { error: "Failed to fetch resume" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const { id } = await params;
    const body = sanitizeBody<Partial<NewResume>>(await request.json());
    if (body.jobId && !(await ownsJob(String(body.jobId), ctx.profile.id))) {
      return NextResponse.json({ error: "Unknown job" }, { status: 400 });
    }

    const updated = await db
      .update(resumes)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(resumes.id, id), eq(resumes.profileId, ctx.profile.id)))
      .returning();
    if (!updated.length) return notFound();
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating resume:", error);
    return NextResponse.json(
      { error: "Failed to update resume" },
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
      .delete(resumes)
      .where(and(eq(resumes.id, id), eq(resumes.profileId, ctx.profile.id)))
      .returning({ id: resumes.id });
    if (!deleted.length) return notFound();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resume:", error);
    return NextResponse.json(
      { error: "Failed to delete resume" },
      { status: 500 }
    );
  }
}
