import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { coverLetters, type NewCoverLetter } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";
import { ownsJob, sanitizeBody } from "@/lib/api-guard";

export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const items = await db
      .select()
      .from(coverLetters)
      .where(eq(coverLetters.profileId, ctx.profile.id))
      .orderBy(desc(coverLetters.createdAt));
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching cover letters:", error);
    return NextResponse.json(
      { error: "Failed to fetch cover letters" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const body = sanitizeBody<Omit<NewCoverLetter, "profileId">>(await request.json());
    // Stops a cover letter being attached to somebody else's job.
    if (body.jobId && !(await ownsJob(String(body.jobId), ctx.profile.id))) {
      return NextResponse.json({ error: "Unknown job" }, { status: 400 });
    }

    const inserted = await db
      .insert(coverLetters)
      .values({ ...body, profileId: ctx.profile.id })
      .returning();
    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error("Error creating cover letter:", error);
    return NextResponse.json(
      { error: "Failed to create cover letter" },
      { status: 500 }
    );
  }
}
