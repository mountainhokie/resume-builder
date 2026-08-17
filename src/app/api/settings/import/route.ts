import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
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
  profiles,
  resumes,
} from "@/lib/schema";
import { getAuthedProfile, unauthorized } from "@/lib/auth-helpers";
import { parseBundle, remapIds, toDate } from "@/lib/portability";

type Mode = "replace" | "merge";

/**
 * Restores an exported bundle into the signed-in profile.
 *
 * Everything is written through a single db.batch(), which the Neon driver
 * sends as one server-side transaction — db.transaction() throws on neon-http.
 * That matters most in replace mode: a half-applied import that had already
 * deleted the old rows would be worse than no import at all.
 *
 * Ids are reissued before anything is written, so nothing here depends on
 * reading a generated id back mid-flight.
 */
export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return unauthorized();
    const profileId = ctx.profile.id;

    const payload = (await request.json()) as { mode?: Mode; bundle?: unknown };
    const mode: Mode = payload.mode === "merge" ? "merge" : "replace";

    const parsed = parseBundle(payload.bundle);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const bundle = parsed.bundle;
    const data = remapIds(bundle);

    const statements = [];

    if (mode === "replace") {
      // Children first. Deleting jobs cascades to interviews, but resumes and
      // cover letters only have their jobId nulled, so they go first anyway.
      statements.push(
        db.delete(resumes).where(eq(resumes.profileId, profileId)),
        db.delete(coverLetters).where(eq(coverLetters.profileId, profileId)),
        db
          .delete(interviewQuestions)
          .where(eq(interviewQuestions.profileId, profileId)),
        db.delete(jobs).where(eq(jobs.profileId, profileId)),
        db.delete(education).where(eq(education.profileId, profileId)),
        db.delete(employment).where(eq(employment.profileId, profileId)),
        db
          .delete(applicationAnswers)
          .where(eq(applicationAnswers.profileId, profileId)),
        db
          .delete(coverLetterTemplates)
          .where(eq(coverLetterTemplates.profileId, profileId)),
        // Scoped to this profile so curated mappings, which every user shares,
        // are never touched.
        db
          .delete(fieldMappings)
          .where(
            and(
              eq(fieldMappings.profileId, profileId),
              isNotNull(fieldMappings.profileId)
            )
          )
      );

      // The profile row itself is not replaced — it carries the user_id link.
      // Only the fields the bundle describes are overwritten.
      statements.push(
        db
          .update(profiles)
          .set({
            firstName: bundle.profile.firstName,
            lastName: bundle.profile.lastName,
            email: bundle.profile.email,
            phone: bundle.profile.phone ?? null,
            address: bundle.profile.address ?? null,
            positionTitle: bundle.profile.positionTitle ?? null,
            skills: bundle.profile.skills ?? [],
            portfolio: bundle.profile.portfolio ?? null,
            github: bundle.profile.github ?? null,
            linkedin: bundle.profile.linkedin ?? null,
            summary: bundle.profile.summary ?? null,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, profileId))
      );
    }

    if (data.education.length) {
      statements.push(
        db.insert(education).values(
          data.education.map((row) => ({
            id: row.id,
            profileId,
            institution: row.institution,
            location: row.location ?? null,
            yearFrom: row.yearFrom ?? null,
            yearTo: row.yearTo ?? null,
            diplomaType: row.diplomaType ?? null,
            concentration: row.concentration ?? null,
            minor: row.minor ?? null,
            createdAt: toDate(row.createdAt),
          }))
        )
      );
    }

    if (data.employment.length) {
      statements.push(
        db.insert(employment).values(
          data.employment.map((row) => ({
            id: row.id,
            profileId,
            companyName: row.companyName,
            location: row.location ?? null,
            positionTitle: row.positionTitle ?? null,
            monthFrom: row.monthFrom ?? null,
            yearFrom: row.yearFrom ?? null,
            monthTo: row.monthTo ?? null,
            yearTo: row.yearTo ?? null,
            isCurrent: row.isCurrent ?? false,
            duties: row.duties,
            createdAt: toDate(row.createdAt),
          }))
        )
      );
    }

    if (data.jobs.length) {
      statements.push(
        db.insert(jobs).values(
          data.jobs.map((row) => ({
            id: row.id,
            profileId,
            title: row.title,
            company: row.company ?? null,
            url: row.url ?? null,
            description: row.description ?? null,
            benefits: row.benefits ?? null,
            status: row.status ?? "Applied",
            notes: row.notes ?? null,
            // Preserved because the tracker ages an application off this.
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          }))
        )
      );
    }

    if (data.interviews.length) {
      statements.push(
        db.insert(interviews).values(
          data.interviews.map((row) => ({
            id: row.id,
            jobId: row.jobId,
            date: row.date,
            interviewer: row.interviewer ?? null,
            type: row.type ?? null,
            notes: row.notes ?? null,
            createdAt: toDate(row.createdAt),
          }))
        )
      );
    }

    if (data.interviewQuestions.length) {
      statements.push(
        db.insert(interviewQuestions).values(
          data.interviewQuestions.map((row) => ({
            id: row.id,
            profileId,
            question: row.question,
            answer: row.answer ?? null,
            company: row.company ?? null,
            interviewer: row.interviewer ?? null,
            type: row.type ?? null,
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          }))
        )
      );
    }

    if (data.resumes.length) {
      statements.push(
        db.insert(resumes).values(
          data.resumes.map((row) => ({
            id: row.id,
            profileId,
            jobId: row.jobId,
            name: row.name,
            template: row.template ?? "classic",
            selectedEducation: row.selectedEducation,
            selectedEmployment: row.selectedEmployment,
            selectedSkills: row.selectedSkills ?? [],
            selectedDuties: row.selectedDuties,
            customPositionTitle: row.customPositionTitle ?? null,
            customPositionTitles: row.customPositionTitles,
            customSummary: row.customSummary ?? null,
            customSections: row.customSections ?? [],
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          }))
        )
      );
    }

    if (data.coverLetters.length) {
      statements.push(
        db.insert(coverLetters).values(
          data.coverLetters.map((row) => ({
            id: row.id,
            profileId,
            jobId: row.jobId,
            name: row.name,
            template: row.template ?? "standard",
            recipientName: row.recipientName ?? null,
            recipientTitle: row.recipientTitle ?? null,
            companyName: row.companyName ?? null,
            companyAddress: row.companyAddress ?? null,
            opening: row.opening ?? null,
            body: row.body ?? null,
            closing: row.closing ?? null,
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          }))
        )
      );
    }

    if (data.coverLetterTemplates.length) {
      statements.push(
        db
          .insert(coverLetterTemplates)
          .values(
            data.coverLetterTemplates.map((row) => ({
              id: row.id,
              profileId,
              name: row.name,
              opening: row.opening ?? null,
              body: row.body ?? null,
              closing: row.closing ?? null,
              isDefault: row.isDefault ?? false,
              createdAt: toDate(row.createdAt),
              updatedAt: toDate(row.updatedAt),
            }))
          )
          // Merging into a profile that already has a template of the same
          // name should not abort the whole import.
          .onConflictDoNothing()
      );
    }

    if (data.applicationAnswers.length) {
      statements.push(
        db
          .insert(applicationAnswers)
          .values(
            data.applicationAnswers.map((row) => ({
              id: row.id,
              profileId,
              key: row.key,
              label: row.label,
              value: row.value ?? null,
              valueType: row.valueType ?? "text",
              synonyms: row.synonyms ?? [],
              isSensitive: row.isSensitive ?? false,
              sortOrder: row.sortOrder ?? 0,
              createdAt: toDate(row.createdAt),
              updatedAt: toDate(row.updatedAt),
            }))
          )
          .onConflictDoNothing()
      );
    }

    if (data.fieldMappings.length) {
      statements.push(
        db
          .insert(fieldMappings)
          .values(
            data.fieldMappings.map((row) => ({
              id: row.id,
              profileId,
              scope: row.scope,
              scopeType: row.scopeType ?? "host",
              host: row.host ?? null,
              fieldFingerprint: row.fieldFingerprint,
              answerKey: row.answerKey,
              label: row.label ?? null,
              selector: row.selector ?? null,
              timesUsed: row.timesUsed ?? 0,
              createdAt: toDate(row.createdAt),
            }))
          )
          .onConflictDoNothing()
      );
    }

    if (statements.length) {
      await db.batch(
        statements as unknown as Parameters<typeof db.batch>[0]
      );
    }

    return NextResponse.json({
      mode,
      imported: {
        education: data.education.length,
        employment: data.employment.length,
        jobs: data.jobs.length,
        interviews: data.interviews.length,
        interviewQuestions: data.interviewQuestions.length,
        resumes: data.resumes.length,
        coverLetters: data.coverLetters.length,
        coverLetterTemplates: data.coverLetterTemplates.length,
        applicationAnswers: data.applicationAnswers.length,
        fieldMappings: data.fieldMappings.length,
      },
      // Surfaced rather than hidden: an interview without its job cannot be
      // stored, and the user should know a row was left behind.
      skippedInterviews: bundle.interviews.length - data.interviews.length,
    });
  } catch (error) {
    console.error("Error importing data:", error);
    return NextResponse.json(
      {
        error:
          "Import failed and nothing was changed. Check the file is a Resume " +
          "Builder export and try again.",
      },
      { status: 500 }
    );
  }
}
