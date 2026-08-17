import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviews, type NewInterview } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";
import { ownsJob, sanitizeBody } from "@/lib/api-guard";

// Interviews hang off a job rather than the profile, so ownership is always
// established through the parent job.

export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }
    if (!(await ownsJob(jobId, ctx.profile.id))) {
      return NextResponse.json([]);
    }

    const items = await db
      .select()
      .from(interviews)
      .where(eq(interviews.jobId, jobId))
      .orderBy(asc(interviews.date));
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const body = sanitizeBody<NewInterview>(await request.json());
    const jobId = body.jobId ? String(body.jobId) : "";
    if (!jobId || !(await ownsJob(jobId, ctx.profile.id))) {
      return NextResponse.json({ error: "Unknown job" }, { status: 400 });
    }

    const inserted = await db.insert(interviews).values(body).returning();
    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error("Error creating interview:", error);
    return NextResponse.json(
      { error: "Failed to create interview" },
      { status: 500 }
    );
  }
}
