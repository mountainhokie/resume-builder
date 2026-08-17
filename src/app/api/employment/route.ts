import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employment, type NewEmployment } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";
import { sanitizeBody } from "@/lib/api-guard";

export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const items = await db
      .select()
      .from(employment)
      .where(eq(employment.profileId, ctx.profile.id));
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching employment:", error);
    return NextResponse.json(
      { error: "Failed to fetch employment" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const body = sanitizeBody<Omit<NewEmployment, "profileId">>(await request.json());
    const inserted = await db
      .insert(employment)
      .values({ ...body, profileId: ctx.profile.id })
      .returning();
    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error("Error creating employment:", error);
    return NextResponse.json(
      { error: "Failed to create employment" },
      { status: 500 }
    );
  }
}
