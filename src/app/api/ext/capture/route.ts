import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { coverLetters, coverLetterTemplates, jobs } from "@/lib/schema";
import { getAuthedProfile } from "@/lib/auth-helpers";
import { corsJson, handlePreflight } from "@/lib/ext-cors";
import {
  STARTER_TEMPLATE,
  coverLetterNameFor,
  generateCoverLetter,
  type TemplateParts,
} from "@/lib/cover-letter-template";

export async function OPTIONS(request: Request) {
  return handlePreflight(request);
}

type CaptureBody = {
  title?: string;
  company?: string;
  url?: string;
  description?: string;
  benefits?: string;
  notes?: string;
  status?: string;
  createCoverLetter?: boolean;
  /** Falls back to the profile's default template when omitted. */
  templateId?: string;
};

/**
 * One round trip for the extension's main action: record the job and, when
 * asked, draft the cover letter from the user's template.
 *
 * Doing both here rather than in two calls keeps the side panel responsive on
 * slow connections and avoids leaving a job with a half-created letter.
 */
export async function POST(request: Request) {
  try {
    const ctx = await getAuthedProfile(request);
    if (!ctx) return corsJson({ error: "Unauthorized" }, request, { status: 401 });

    const body = (await request.json()) as CaptureBody;
    const title = body.title?.trim();
    if (!title) {
      return corsJson({ error: "title is required" }, request, { status: 400 });
    }

    const inserted = await db
      .insert(jobs)
      .values({
        profileId: ctx.profile.id,
        title,
        company: body.company?.trim() || null,
        url: body.url?.slice(0, 1000) || null,
        description: body.description || null,
        benefits: body.benefits || null,
        notes: body.notes || null,
        status: body.status || "Applied",
      })
      .returning();
    const job = inserted[0];

    let coverLetter = null;
    let templateUsed: { name: string; isStarter: boolean } | null = null;
    if (body.createCoverLetter) {
      const resolved = await resolveTemplate(ctx.profile.id, body.templateId);
      templateUsed = {
        name: resolved.name,
        isStarter: resolved.isStarter,
      };
      const parts = generateCoverLetter(resolved.template, {
        position: job.title,
        company: job.company,
      });
      const created = await db
        .insert(coverLetters)
        .values({
          profileId: ctx.profile.id,
          jobId: job.id,
          name: coverLetterNameFor(job.title, job.company),
          template: "standard",
          companyName: job.company,
          ...parts,
        })
        .returning();
      coverLetter = created[0];
    }

    return corsJson(
      {
        job,
        coverLetter,
        // Lets the extension say which template it drafted from, so falling
        // back to the built-in starter is visible rather than silent.
        coverLetterTemplate: templateUsed,
        links: {
          job: `/jobs/${job.id}`,
          coverLetter: coverLetter ? `/cover-letter/${coverLetter.id}` : null,
        },
      },
      request
    );
  } catch (error) {
    console.error("Error capturing job:", error);
    return corsJson({ error: "Failed to capture job" }, request, {
      status: 500,
    });
  }
}

type ResolvedTemplate = {
  template: TemplateParts;
  name: string;
  isStarter: boolean;
};

/**
 * Named template if asked for and owned, else the profile's default, else its
 * most recently edited one, else the built-in starter.
 *
 * Never returns null: a captured job used to come back with a cover letter
 * whose body was an empty string, which looked like the feature was broken
 * rather than like the template was missing.
 */
async function resolveTemplate(
  profileId: string,
  templateId?: string
): Promise<ResolvedTemplate> {
  if (templateId) {
    const rows = await db
      .select()
      .from(coverLetterTemplates)
      .where(
        and(
          eq(coverLetterTemplates.id, templateId),
          eq(coverLetterTemplates.profileId, profileId)
        )
      )
      .limit(1);
    if (rows.length) return own(rows[0]);
  }

  const defaults = await db
    .select()
    .from(coverLetterTemplates)
    .where(
      and(
        eq(coverLetterTemplates.profileId, profileId),
        eq(coverLetterTemplates.isDefault, true)
      )
    )
    .limit(1);
  if (defaults.length) return own(defaults[0]);

  const any = await db
    .select()
    .from(coverLetterTemplates)
    .where(eq(coverLetterTemplates.profileId, profileId))
    .orderBy(desc(coverLetterTemplates.updatedAt))
    .limit(1);
  if (any.length) return own(any[0]);

  return { template: STARTER_TEMPLATE, name: "Starter", isStarter: true };
}

function own(row: {
  name: string;
  opening: string | null;
  body: string | null;
  closing: string | null;
}): ResolvedTemplate {
  return {
    template: { opening: row.opening, body: row.body, closing: row.closing },
    name: row.name,
    isStarter: false,
  };
}
