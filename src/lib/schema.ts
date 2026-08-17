import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Auth.js (NextAuth) tables — shape is dictated by @auth/drizzle-adapter.
// Column names use the adapter's expected casing; do not rename them.
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: varchar("image", { length: 1000 }),
  // Null for accounts that only ever sign in through an OAuth provider.
  passwordHash: varchar("password_hash", { length: 255 }),
  // Gates promotion of a personal field mapping into the curated shared tier.
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Email/password signups that have not proved they own the address yet.
 *
 * Held here rather than as an unverified `users` row on purpose. If an
 * unverified user existed, someone could register an address they do not own
 * and wait: when the real owner later signed in with Google, the two would be
 * linked by email and the squatter's password would open the real account.
 * With no user row until verification, every row in `users` has an address
 * proved either by us or by an OAuth provider, which is what makes linking by
 * email safe.
 */
export const pendingRegistrations = pgTable("pending_registrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  // Only the SHA-256 of the emailed token is stored.
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("password_reset_tokens_user_idx").on(t.userId)]
);

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("accounts_user_id_idx").on(t.userId),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// ---------------------------------------------------------------------------
// Application tables
// ---------------------------------------------------------------------------

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Nullable so the pre-auth profile row can be claimed on first sign-in.
  // Unique so a user can never end up with two profiles.
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  address: varchar("address", { length: 500 }),
  positionTitle: varchar("position_title", { length: 200 }),
  skills: jsonb("skills").$type<string[]>().default([]),
  portfolio: varchar("portfolio", { length: 500 }),
  github: varchar("github", { length: 500 }),
  linkedin: varchar("linkedin", { length: 500 }),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const education = pgTable("education", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  institution: varchar("institution", { length: 300 }).notNull(),
  location: varchar("location", { length: 300 }),
  yearFrom: integer("year_from"),
  yearTo: integer("year_to"),
  diplomaType: varchar("diploma_type", { length: 100 }),
  concentration: varchar("concentration", { length: 200 }),
  minor: varchar("minor", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const employment = pgTable("employment", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  companyName: varchar("company_name", { length: 300 }).notNull(),
  location: varchar("location", { length: 300 }),
  positionTitle: varchar("position_title", { length: 200 }),
  monthFrom: integer("month_from"),
  yearFrom: integer("year_from"),
  monthTo: integer("month_to"),
  yearTo: integer("year_to"),
  isCurrent: boolean("is_current").default(false),
  duties: jsonb("duties").$type<{ id: string; text: string }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  company: varchar("company", { length: 300 }),
  url: varchar("url", { length: 1000 }),
  description: text("description"),
  benefits: text("benefits"),
  status: varchar("status", { length: 50 })
    .notNull()
    .default("Applied"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const resumes = pgTable("resumes", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  name: varchar("name", { length: 300 }).notNull(),
  template: varchar("template", { length: 50 }).notNull().default("classic"),
  selectedEducation: jsonb("selected_education").$type<string[]>().default([]),
  selectedEmployment: jsonb("selected_employment")
    .$type<string[]>()
    .default([]),
  selectedSkills: jsonb("selected_skills").$type<string[]>().default([]),
  selectedDuties: jsonb("selected_duties").$type<string[]>().default([]),
  customPositionTitle: varchar("custom_position_title", { length: 200 }),
  customPositionTitles: jsonb("custom_position_titles").$type<Record<string, string>>().default({}),
  customSummary: text("custom_summary"),
  customSections: jsonb("custom_sections")
    .$type<{ title: string; content: string }[]>()
    .default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const coverLetters = pgTable("cover_letters", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  name: varchar("name", { length: 300 }).notNull(),
  template: varchar("template", { length: 50 }).notNull().default("standard"),
  recipientName: varchar("recipient_name", { length: 200 }),
  recipientTitle: varchar("recipient_title", { length: 200 }),
  companyName: varchar("company_name", { length: 300 }),
  companyAddress: varchar("company_address", { length: 500 }),
  opening: text("opening"),
  body: text("body"),
  closing: text("closing"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const interviews = pgTable("interviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .references(() => jobs.id, { onDelete: "cascade" })
    .notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  interviewer: varchar("interviewer", { length: 200 }),
  type: varchar("type", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const interviewQuestions = pgTable("interview_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id")
    .references(() => profiles.id, { onDelete: "cascade" })
    .notNull(),
  question: text("question").notNull(),
  answer: text("answer"),
  company: varchar("company", { length: 300 }),
  interviewer: varchar("interviewer", { length: 200 }),
  type: varchar("type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Cover letter defaults — previously localStorage ("coverLetterDefaults"),
// moved server-side so the extension can generate letters too.
// ---------------------------------------------------------------------------

export const coverLetterTemplates = pgTable(
  "cover_letter_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    opening: text("opening"),
    body: text("body"),
    closing: text("closing"),
    // The template the extension reaches for when capturing a job.
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("cover_letter_templates_profile_name_idx").on(
      t.profileId,
      t.name
    ),
    // At most one default per profile.
    uniqueIndex("cover_letter_templates_one_default_idx")
      .on(t.profileId)
      .where(sql`${t.isDefault}`),
  ]
);

// ---------------------------------------------------------------------------
// Autofill: the answer library and the learned field mappings.
// ---------------------------------------------------------------------------

/**
 * Reusable answers to the questions applications keep asking.
 * `key` is the stable identifier the autofill engine matches against
 * (e.g. "work_authorization"); `label` is what the user sees.
 */
export const applicationAnswers = pgTable(
  "application_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .references(() => profiles.id, { onDelete: "cascade" })
      .notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    label: varchar("label", { length: 300 }).notNull(),
    value: text("value"),
    // text | textarea | select | boolean | date | number
    valueType: varchar("value_type", { length: 20 }).notNull().default("text"),
    // Extra strings the matcher should treat as equivalent to `label`.
    synonyms: jsonb("synonyms").$type<string[]>().default([]),
    // Demographic / EEO answers. Never filled without explicit opt-in.
    isSensitive: boolean("is_sensitive").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("application_answers_profile_key_idx").on(t.profileId, t.key),
  ]
);

/**
 * Fields the user has taught the extension about.
 *
 * Keyed by `fieldFingerprint` rather than a CSS selector: Workday, Greenhouse
 * and Ashby all generate DOM ids per session, so a raw selector goes stale on
 * the next visit. The fingerprint is a hash of the field's stable traits
 * (input type + name + normalized label text), computed extension-side.
 * `selector` and `label` are retained for display and debugging only.
 *
 * `scope` is the ATS platform id ("workday") when the host is recognised, and
 * the bare hostname otherwise. Platform scoping is what makes Workday and
 * iCIMS usable: both give every employer its own subdomain, so host-keyed
 * mappings would have to be re-taught at every company.
 *
 * A NULL `profileId` marks a curated mapping shared with every user. The fill
 * engine resolves most specific first:
 *   own+host -> own+platform -> shared+host -> shared+platform -> heuristics
 */
export const fieldMappings = pgTable(
  "field_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").references(() => profiles.id, {
      onDelete: "cascade",
    }),
    scope: varchar("scope", { length: 255 }).notNull(),
    // 'platform' | 'host' — how `scope` should be interpreted.
    scopeType: varchar("scope_type", { length: 20 }).notNull().default("host"),
    // Where it was actually learned. Informational; aids curation review.
    host: varchar("host", { length: 255 }),
    fieldFingerprint: varchar("field_fingerprint", { length: 64 }).notNull(),
    answerKey: varchar("answer_key", { length: 100 }).notNull(),
    label: text("label"),
    selector: text("selector"),
    timesUsed: integer("times_used").default(0).notNull(),
    lastUsedAt: timestamp("last_used_at"),
    // Who promoted this into the shared tier. Set only on curated rows.
    curatedBy: uuid("curated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    // Partial indexes rather than one composite: Postgres treats NULLs as
    // distinct, so a plain unique over a nullable profileId would let
    // duplicate curated rows through.
    uniqueIndex("field_mappings_owned_idx")
      .on(t.profileId, t.scope, t.fieldFingerprint)
      .where(sql`${t.profileId} IS NOT NULL`),
    uniqueIndex("field_mappings_curated_idx")
      .on(t.scope, t.fieldFingerprint)
      .where(sql`${t.profileId} IS NULL`),
    index("field_mappings_lookup_idx").on(t.profileId, t.scope),
  ]
);

// ---------------------------------------------------------------------------
// Extension auth: the web app acts as the authorization server so the
// extension never holds Google/GitHub/LinkedIn client secrets.
// ---------------------------------------------------------------------------

/** Short-lived single-use PKCE codes issued by /api/ext/auth/authorize. */
export const extAuthCodes = pgTable("ext_auth_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  codeHash: varchar("code_hash", { length: 64 }).notNull().unique(),
  codeChallenge: varchar("code_challenge", { length: 128 }).notNull(),
  codeChallengeMethod: varchar("code_challenge_method", { length: 10 })
    .notNull()
    .default("S256"),
  redirectUri: text("redirect_uri").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Long-lived extension sessions. Only the SHA-256 hash is ever stored. */
export const extRefreshTokens = pgTable(
  "ext_refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    deviceLabel: varchar("device_label", { length: 200 }),
    expiresAt: timestamp("expires_at").notNull(),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("ext_refresh_tokens_user_idx").on(t.userId)]
);

// Types
export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Education = typeof education.$inferSelect;
export type NewEducation = typeof education.$inferInsert;
export type Employment = typeof employment.$inferSelect;
export type NewEmployment = typeof employment.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;
export type CoverLetter = typeof coverLetters.$inferSelect;
export type NewCoverLetter = typeof coverLetters.$inferInsert;
export type Interview = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;
export type InterviewQuestion = typeof interviewQuestions.$inferSelect;
export type NewInterviewQuestion = typeof interviewQuestions.$inferInsert;
export type CoverLetterTemplate = typeof coverLetterTemplates.$inferSelect;
export type NewCoverLetterTemplate = typeof coverLetterTemplates.$inferInsert;
export type ApplicationAnswer = typeof applicationAnswers.$inferSelect;
export type NewApplicationAnswer = typeof applicationAnswers.$inferInsert;
export type FieldMapping = typeof fieldMappings.$inferSelect;
export type NewFieldMapping = typeof fieldMappings.$inferInsert;
