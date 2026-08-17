import { NextResponse } from "next/server";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applicationAnswers,
  coverLetters,
  coverLetterTemplates,
  education,
  employment,
  fieldMappings,
  interviewQuestions,
  interviews,
  jobs,
  resumes,
} from "@/lib/schema";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";
import { EXPORT_FORMAT, EXPORT_VERSION } from "@/lib/portability";

/**
 * Everything belonging to the signed-in profile, as a downloadable file.
 *
 * No credentials of any kind: user, account and session rows are left out, as
 * are the extension's tokens. Curated field mappings are excluded because they
 * are shared with every user rather than owned by this one.
 */
export async function GET(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();
    const profileId = ctx.profile.id;

    const [
      educationRows,
      employmentRows,
      jobRows,
      questionRows,
      resumeRows,
      letterRows,
      templateRows,
      answerRows,
      mappingRows,
    ] = await Promise.all([
      db.select().from(education).where(eq(education.profileId, profileId)),
      db.select().from(employment).where(eq(employment.profileId, profileId)),
      db.select().from(jobs).where(eq(jobs.profileId, profileId)),
      db
        .select()
        .from(interviewQuestions)
        .where(eq(interviewQuestions.profileId, profileId)),
      db.select().from(resumes).where(eq(resumes.profileId, profileId)),
      db.select().from(coverLetters).where(eq(coverLetters.profileId, profileId)),
      db
        .select()
        .from(coverLetterTemplates)
        .where(eq(coverLetterTemplates.profileId, profileId)),
      db
        .select()
        .from(applicationAnswers)
        .where(eq(applicationAnswers.profileId, profileId)),
      db
        .select()
        .from(fieldMappings)
        .where(
          and(
            eq(fieldMappings.profileId, profileId),
            isNotNull(fieldMappings.profileId)
          )
        ),
    ]);

    // Interviews hang off jobs rather than the profile.
    const jobIds = jobRows.map((j) => j.id);
    const interviewRows = jobIds.length
      ? await db.select().from(interviews).where(inArray(interviews.jobId, jobIds))
      : [];

    /* eslint-disable @typescript-eslint/no-unused-vars -- destructured to drop */
    const { id: _id, userId: _userId, ...profile } = ctx.profile;

    const bundle = {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      profile,
      education: educationRows.map(stripProfileId),
      employment: employmentRows.map(stripProfileId),
      jobs: jobRows.map(stripProfileId),
      interviews: interviewRows,
      interviewQuestions: questionRows.map(stripProfileId),
      resumes: resumeRows.map(stripProfileId),
      coverLetters: letterRows.map(stripProfileId),
      coverLetterTemplates: templateRows.map(stripProfileId),
      applicationAnswers: answerRows.map(stripProfileId),
      fieldMappings: mappingRows.map(
        ({ profileId: _p, curatedBy: _c, ...rest }) => rest
      ),
    };

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(bundle, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="resume-builder-export-${stamp}.json"`,
        // A data export should never be served from a shared cache.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}

function stripProfileId<T extends { profileId?: string }>(row: T) {
  const { profileId: _profileId, ...rest } = row;
  return rest;
}
/* eslint-enable @typescript-eslint/no-unused-vars */
