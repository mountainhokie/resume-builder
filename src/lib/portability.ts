import { z } from "zod";
import { randomUUID } from "crypto";

/**
 * Export and import of everything belonging to one profile, so a user can move
 * their data to a different account — a new email address, a different sign-in
 * provider — without losing anything.
 *
 * Deliberately excluded: user, account and session rows, and the extension's
 * auth codes and refresh tokens. Those belong to an identity, not to the data,
 * and a portable file has no business carrying credentials. Curated field
 * mappings are excluded too; they are shared with everyone rather than owned.
 *
 * Rows keep their original ids in the file so relationships survive the round
 * trip. On import every id is reissued and every reference rewritten, which is
 * what lets the same file be imported into an account that already holds data,
 * or imported twice, without collisions.
 */

export const EXPORT_FORMAT = "resume-builder-export";
export const EXPORT_VERSION = 1;

// --- shared field shapes --------------------------------------------------

const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .or(z.string());
const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().int().nullable().optional();

const dutySchema = z.object({ id: z.string(), text: z.string() });

const profileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: nullableString,
  address: nullableString,
  positionTitle: nullableString,
  skills: z.array(z.string()).nullable().optional(),
  portfolio: nullableString,
  github: nullableString,
  linkedin: nullableString,
  summary: nullableString,
});

const educationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  location: nullableString,
  yearFrom: nullableNumber,
  yearTo: nullableNumber,
  diplomaType: nullableString,
  concentration: nullableString,
  minor: nullableString,
  createdAt: isoDate.optional(),
});

const employmentSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  location: nullableString,
  positionTitle: nullableString,
  monthFrom: nullableNumber,
  yearFrom: nullableNumber,
  monthTo: nullableNumber,
  yearTo: nullableNumber,
  isCurrent: z.boolean().nullable().optional(),
  duties: z.array(dutySchema).nullable().optional(),
  createdAt: isoDate.optional(),
});

const jobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: nullableString,
  url: nullableString,
  description: nullableString,
  benefits: nullableString,
  status: z.string().optional(),
  notes: nullableString,
  createdAt: isoDate.optional(),
  updatedAt: isoDate.optional(),
});

const interviewSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  date: z.string(),
  interviewer: nullableString,
  type: nullableString,
  notes: nullableString,
  createdAt: isoDate.optional(),
});

const interviewQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: nullableString,
  company: nullableString,
  interviewer: nullableString,
  type: nullableString,
  createdAt: isoDate.optional(),
  updatedAt: isoDate.optional(),
});

const resumeSchema = z.object({
  id: z.string(),
  jobId: z.string().nullable().optional(),
  name: z.string(),
  template: z.string().optional(),
  selectedEducation: z.array(z.string()).nullable().optional(),
  selectedEmployment: z.array(z.string()).nullable().optional(),
  selectedSkills: z.array(z.string()).nullable().optional(),
  selectedDuties: z.array(z.string()).nullable().optional(),
  customPositionTitle: nullableString,
  customPositionTitles: z.record(z.string(), z.string()).nullable().optional(),
  customSummary: nullableString,
  customSections: z
    .array(z.object({ title: z.string(), content: z.string() }))
    .nullable()
    .optional(),
  createdAt: isoDate.optional(),
  updatedAt: isoDate.optional(),
});

const coverLetterSchema = z.object({
  id: z.string(),
  jobId: z.string().nullable().optional(),
  name: z.string(),
  template: z.string().optional(),
  recipientName: nullableString,
  recipientTitle: nullableString,
  companyName: nullableString,
  companyAddress: nullableString,
  opening: nullableString,
  body: nullableString,
  closing: nullableString,
  createdAt: isoDate.optional(),
  updatedAt: isoDate.optional(),
});

const coverLetterTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  opening: nullableString,
  body: nullableString,
  closing: nullableString,
  isDefault: z.boolean().optional(),
  createdAt: isoDate.optional(),
  updatedAt: isoDate.optional(),
});

const applicationAnswerSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  value: nullableString,
  valueType: z.string().optional(),
  synonyms: z.array(z.string()).nullable().optional(),
  isSensitive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  createdAt: isoDate.optional(),
  updatedAt: isoDate.optional(),
});

const fieldMappingSchema = z.object({
  id: z.string(),
  scope: z.string(),
  scopeType: z.string().optional(),
  host: nullableString,
  fieldFingerprint: z.string(),
  answerKey: z.string(),
  label: nullableString,
  selector: nullableString,
  timesUsed: z.number().int().optional(),
  createdAt: isoDate.optional(),
});

export const exportBundleSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.number().int().positive(),
  exportedAt: isoDate.optional(),
  profile: profileSchema,
  education: z.array(educationSchema).default([]),
  employment: z.array(employmentSchema).default([]),
  jobs: z.array(jobSchema).default([]),
  interviews: z.array(interviewSchema).default([]),
  interviewQuestions: z.array(interviewQuestionSchema).default([]),
  resumes: z.array(resumeSchema).default([]),
  coverLetters: z.array(coverLetterSchema).default([]),
  coverLetterTemplates: z.array(coverLetterTemplateSchema).default([]),
  applicationAnswers: z.array(applicationAnswerSchema).default([]),
  fieldMappings: z.array(fieldMappingSchema).default([]),
});

export type ExportBundle = z.infer<typeof exportBundleSchema>;

export type ImportCounts = Record<string, number>;

/**
 * Reads a file the user supplied, so the failure messages have to be useful.
 * A version from a future release is rejected outright rather than partially
 * understood — silently dropping fields it does not recognise would lose data
 * the user believes they are carrying across.
 */
export function parseBundle(
  input: unknown
): { ok: true; bundle: ExportBundle } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "That file does not contain a JSON object." };
  }
  const record = input as Record<string, unknown>;

  if (record.format !== EXPORT_FORMAT) {
    return {
      ok: false,
      error:
        "That is not a Resume Builder export file. Look for the .json file " +
        "downloaded from Settings → Export.",
    };
  }
  if (typeof record.version === "number" && record.version > EXPORT_VERSION) {
    return {
      ok: false,
      error:
        `That file was written by a newer version of Resume Builder ` +
        `(format ${record.version}, this app understands ${EXPORT_VERSION}). ` +
        `Update the app before importing it.`,
    };
  }

  const parsed = exportBundleSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.join(".") || "the file";
    return {
      ok: false,
      error: `The file is not valid at "${where}": ${first?.message ?? "unknown problem"}.`,
    };
  }
  return { ok: true, bundle: parsed.data };
}

/**
 * Rewrites a bundle onto freshly generated ids.
 *
 * Every id is reissued and every reference to it rewritten, including the ones
 * buried in JSON columns: a resume's selected education, employment and duty
 * ids, and the per-employment custom titles keyed by employment id. Missing
 * those would leave a resume that renders nothing while looking intact.
 */
export function remapIds(bundle: ExportBundle) {
  const educationIds = new Map<string, string>();
  const employmentIds = new Map<string, string>();
  const dutyIds = new Map<string, string>();
  const jobIds = new Map<string, string>();

  const idFor = (map: Map<string, string>, original: string) => {
    const existing = map.get(original);
    if (existing) return existing;
    const fresh = randomUUID();
    map.set(original, fresh);
    return fresh;
  };

  const education = bundle.education.map((row) => ({
    ...row,
    id: idFor(educationIds, row.id),
  }));

  const employment = bundle.employment.map((row) => ({
    ...row,
    id: idFor(employmentIds, row.id),
    duties: (row.duties ?? []).map((duty) => ({
      id: idFor(dutyIds, duty.id),
      text: duty.text,
    })),
  }));

  const jobs = bundle.jobs.map((row) => ({
    ...row,
    id: idFor(jobIds, row.id),
  }));

  // An interview whose job did not come across has nowhere to hang; jobId is
  // NOT NULL, so those rows are dropped rather than smuggled in detached.
  const interviews = bundle.interviews
    .filter((row) => jobIds.has(row.jobId))
    .map((row) => ({
      ...row,
      id: randomUUID(),
      jobId: jobIds.get(row.jobId)!,
    }));

  const resumes = bundle.resumes.map((row) => ({
    ...row,
    id: randomUUID(),
    jobId: row.jobId ? (jobIds.get(row.jobId) ?? null) : null,
    selectedEducation: mapExisting(row.selectedEducation, educationIds),
    selectedEmployment: mapExisting(row.selectedEmployment, employmentIds),
    selectedDuties: mapExisting(row.selectedDuties, dutyIds),
    // Keys are employment ids; values are the user's per-resume job titles.
    customPositionTitles: Object.fromEntries(
      Object.entries(row.customPositionTitles ?? {})
        .filter(([key]) => employmentIds.has(key))
        .map(([key, value]) => [employmentIds.get(key)!, value])
    ),
  }));

  const coverLetters = bundle.coverLetters.map((row) => ({
    ...row,
    id: randomUUID(),
    jobId: row.jobId ? (jobIds.get(row.jobId) ?? null) : null,
  }));

  const rest = {
    interviewQuestions: bundle.interviewQuestions.map((r) => ({
      ...r,
      id: randomUUID(),
    })),
    coverLetterTemplates: dedupeTemplates(bundle.coverLetterTemplates),
    applicationAnswers: dedupeAnswers(bundle.applicationAnswers),
    fieldMappings: dedupeMappings(bundle.fieldMappings),
  };

  return { education, employment, jobs, interviews, resumes, coverLetters, ...rest };
}

function mapExisting(
  ids: string[] | null | undefined,
  map: Map<string, string>
): string[] {
  return (ids ?? []).filter((id) => map.has(id)).map((id) => map.get(id)!);
}

/**
 * The unique indexes these tables carry are enforced by the database, so a file
 * containing duplicates would abort the whole import. Collapsing them here
 * keeps a slightly malformed file importable instead of failing at the last
 * step, and only ever discards a row that could not have been stored anyway.
 */
function dedupeTemplates(rows: ExportBundle["coverLetterTemplates"]) {
  const seen = new Set<string>();
  let defaultTaken = false;
  const out = [];
  for (const row of rows) {
    if (seen.has(row.name)) continue;
    seen.add(row.name);
    // At most one default per profile, enforced by a partial unique index.
    const isDefault = Boolean(row.isDefault) && !defaultTaken;
    if (isDefault) defaultTaken = true;
    out.push({ ...row, id: randomUUID(), isDefault });
  }
  return out;
}

function dedupeAnswers(rows: ExportBundle["applicationAnswers"]) {
  const seen = new Set<string>();
  return rows
    .filter((row) => !seen.has(row.key) && seen.add(row.key))
    .map((row) => ({ ...row, id: randomUUID() }));
}

function dedupeMappings(rows: ExportBundle["fieldMappings"]) {
  const seen = new Set<string>();
  return rows
    .filter((row) => {
      const key = `${row.scope} ${row.fieldFingerprint}`;
      return !seen.has(key) && seen.add(key);
    })
    .map((row) => ({ ...row, id: randomUUID() }));
}

/** Dates arrive as strings; preserve them so an application's age survives. */
export function toDate(value: string | undefined, fallback = new Date()): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}
