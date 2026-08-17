import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviewQuestions, type NewInterviewQuestion } from "@/lib/schema";
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
    const body = sanitizeBody<Partial<NewInterviewQuestion>>(await request.json());
    const updated = await db
      .update(interviewQuestions)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(interviewQuestions.id, id),
          eq(interviewQuestions.profileId, ctx.profile.id)
        )
      )
      .returning();
    if (!updated.length) return notFound();
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating interview question:", error);
    return NextResponse.json(
      { error: "Failed to update interview question" },
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
      .delete(interviewQuestions)
      .where(
        and(
          eq(interviewQuestions.id, id),
          eq(interviewQuestions.profileId, ctx.profile.id)
        )
      )
      .returning({ id: interviewQuestions.id });
    if (!deleted.length) return notFound();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting interview question:", error);
    return NextResponse.json(
      { error: "Failed to delete interview question" },
      { status: 500 }
    );
  }
}
