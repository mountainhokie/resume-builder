import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviewQuestions, type NewInterviewQuestion } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";
import { sanitizeBody } from "@/lib/api-guard";

export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const items = await db
      .select()
      .from(interviewQuestions)
      .where(eq(interviewQuestions.profileId, ctx.profile.id))
      .orderBy(desc(interviewQuestions.updatedAt));
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const body = sanitizeBody<Omit<NewInterviewQuestion, "profileId">>(await request.json());
    const inserted = await db
      .insert(interviewQuestions)
      .values({ ...body, profileId: ctx.profile.id })
      .returning();
    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error("Error creating interview question:", error);
    return NextResponse.json(
      { error: "Failed to create interview question" },
      { status: 500 }
    );
  }
}
