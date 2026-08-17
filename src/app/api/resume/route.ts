import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resumes, type NewResume } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";
import { ownsJob, sanitizeBody } from "@/lib/api-guard";

export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const items = await db
      .select()
      .from(resumes)
      .where(eq(resumes.profileId, ctx.profile.id))
      .orderBy(desc(resumes.createdAt));
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching resumes:", error);
    return NextResponse.json(
      { error: "Failed to fetch resumes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const body = sanitizeBody<Omit<NewResume, "profileId">>(await request.json());
    // Stops a resume being attached to somebody else's job.
    if (body.jobId && !(await ownsJob(String(body.jobId), ctx.profile.id))) {
      return NextResponse.json({ error: "Unknown job" }, { status: 400 });
    }

    const inserted = await db
      .insert(resumes)
      .values({ ...body, profileId: ctx.profile.id })
      .returning();
    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error("Error creating resume:", error);
    return NextResponse.json(
      { error: "Failed to create resume" },
      { status: 500 }
    );
  }
}
