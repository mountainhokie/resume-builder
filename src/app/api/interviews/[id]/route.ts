import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviews, jobs, type NewInterview } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getAuthedProfile, notFound, unauthorized } from "@/lib/auth-helpers";
import { ownsJob, sanitizeBody } from "@/lib/api-guard";

/**
 * Interviews carry no profileId, so ownership is resolved by joining to the
 * parent job. Drizzle cannot express a join inside UPDATE/DELETE, so the check
 * runs first and the mutation is keyed by the interview id afterwards.
 */
async function ownsInterview(id: string, profileId: string): Promise<boolean> {
  const rows = await db
    .select({ id: interviews.id })
    .from(interviews)
    .innerJoin(jobs, eq(interviews.jobId, jobs.id))
    .where(and(eq(interviews.id, id), eq(jobs.profileId, profileId)))
    .limit(1);
  return rows.length > 0;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const { id } = await params;
    if (!(await ownsInterview(id, ctx.profile.id))) return notFound();

    const body = sanitizeBody<Partial<NewInterview>>(await request.json());
    // Reparenting is only allowed onto another job the caller owns.
    if (body.jobId && !(await ownsJob(String(body.jobId), ctx.profile.id))) {
      return NextResponse.json({ error: "Unknown job" }, { status: 400 });
    }

    const updated = await db
      .update(interviews)
      .set(body)
      .where(eq(interviews.id, id))
      .returning();
    if (!updated.length) return notFound();
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating interview:", error);
    return NextResponse.json(
      { error: "Failed to update interview" },
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
    if (!(await ownsInterview(id, ctx.profile.id))) return notFound();

    await db.delete(interviews).where(eq(interviews.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting interview:", error);
    return NextResponse.json(
      { error: "Failed to delete interview" },
      { status: 500 }
    );
  }
}
