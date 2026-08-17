import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs, type NewJob } from "@/lib/schema";
import { eq, desc, and, lte } from "drizzle-orm";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";
import { sanitizeBody } from "@/lib/api-guard";

export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();
    const profileId = ctx.profile.id;

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    await db
      .update(jobs)
      .set({ status: "Ghosted", updatedAt: new Date() })
      .where(
        and(
          eq(jobs.profileId, profileId),
          eq(jobs.status, "Applied"),
          lte(jobs.createdAt, sixtyDaysAgo)
        )
      );

    const items = await db
      .select()
      .from(jobs)
      .where(eq(jobs.profileId, profileId))
      .orderBy(desc(jobs.createdAt));
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const body = sanitizeBody<Omit<NewJob, "profileId">>(await request.json());
    const inserted = await db
      .insert(jobs)
      .values({ ...body, profileId: ctx.profile.id })
      .returning();
    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
