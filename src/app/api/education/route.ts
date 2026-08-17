import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { education, type NewEducation } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";
import { sanitizeBody } from "@/lib/api-guard";

export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const items = await db
      .select()
      .from(education)
      .where(eq(education.profileId, ctx.profile.id));
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching education:", error);
    return NextResponse.json(
      { error: "Failed to fetch education" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const body = sanitizeBody<Omit<NewEducation, "profileId">>(await request.json());
    const inserted = await db
      .insert(education)
      .values({ ...body, profileId: ctx.profile.id })
      .returning();
    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error("Error creating education:", error);
    return NextResponse.json(
      { error: "Failed to create education" },
      { status: 500 }
    );
  }
}
