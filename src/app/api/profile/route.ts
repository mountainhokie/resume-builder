import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, type NewProfile } from "@/lib/schema";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";
import { sanitizeBody } from "@/lib/api-guard";

export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();
    return NextResponse.json(ctx.profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();

    const body = sanitizeBody<Partial<NewProfile>>(await request.json());
    const updated = await db
      .update(profiles)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(profiles.id, ctx.profile.id))
      .returning();
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error saving profile:", error);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
