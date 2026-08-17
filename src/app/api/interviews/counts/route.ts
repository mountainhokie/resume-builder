import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { interviews, jobs } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const result = await db
      .select({
        jobId: interviews.jobId,
        count: sql<number>`count(*)::int`,
      })
      .from(interviews)
      .innerJoin(jobs, eq(interviews.jobId, jobs.id))
      .where(eq(jobs.profileId, ctx.profile.id))
      .groupBy(interviews.jobId);

    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.jobId] = row.count;
    }
    return NextResponse.json(counts);
  } catch {
    return NextResponse.json({});
  }
}
