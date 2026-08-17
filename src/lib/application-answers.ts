/**
 * The default answer library seeded for every new profile.
 *
 * `key` is the stable identifier the autofill matcher targets — renaming one
 * orphans any field_mappings rows pointing at it, so treat these as permanent.
 * `synonyms` widen the heuristic match; they are the phrasings ATS platforms
 * actually use, so add to them freely as you encounter new wording.
 */

export type AnswerValueType =
  | "text"
  | "textarea"
  | "select"
  | "boolean"
  | "date"
  | "number";

export type AnswerSeed = {
  key: string;
  label: string;
  valueType: AnswerValueType;
  synonyms: string[];
  isSensitive?: boolean;
  /** Filled from the profile record rather than typed by hand. */
  derivedFromProfile?: boolean;
  value?: string;
};

/**
 * Identity fields. These mirror columns already on `profiles`, so they are
 * resolved from the profile at request time rather than duplicated in the
 * answers table — editing your profile keeps autofill correct.
 */
export const PROFILE_DERIVED_ANSWERS: AnswerSeed[] = [
  {
    key: "first_name",
    label: "First name",
    valueType: "text",
    derivedFromProfile: true,
    synonyms: ["given name", "forename", "legal first name"],
  },
  {
    key: "last_name",
    label: "Last name",
    valueType: "text",
    derivedFromProfile: true,
    synonyms: ["surname", "family name", "legal last name"],
  },
  {
    key: "full_name",
    label: "Full name",
    valueType: "text",
    derivedFromProfile: true,
    synonyms: ["name", "your name", "legal name", "candidate name"],
  },
  {
    key: "email",
    label: "Email address",
    valueType: "text",
    derivedFromProfile: true,
    synonyms: ["e-mail", "email address", "contact email"],
  },
  {
    key: "phone",
    label: "Phone number",
    valueType: "text",
    derivedFromProfile: true,
    synonyms: ["telephone", "mobile", "cell", "contact number", "phone"],
  },
  {
    key: "address",
    label: "Address",
    valueType: "text",
    derivedFromProfile: true,
    synonyms: ["street address", "mailing address", "address line 1"],
  },
  {
    key: "linkedin",
    label: "LinkedIn profile",
    valueType: "text",
    derivedFromProfile: true,
    synonyms: ["linkedin url", "linkedin profile", "linkedin"],
  },
  {
    key: "github",
    label: "GitHub profile",
    valueType: "text",
    derivedFromProfile: true,
    synonyms: ["github url", "github profile", "git hub"],
  },
  {
    key: "portfolio",
    label: "Portfolio / website",
    valueType: "text",
    derivedFromProfile: true,
    synonyms: ["website", "personal website", "portfolio url", "other url"],
  },
];

/** Everything an application asks that the profile does not already answer. */
export const DEFAULT_ANSWER_SEEDS: AnswerSeed[] = [
  {
    key: "work_authorization",
    label: "Are you legally authorized to work in the United States?",
    valueType: "boolean",
    synonyms: [
      "legally authorized to work",
      "authorized to work",
      "work authorization",
      "eligible to work",
      "right to work",
    ],
  },
  {
    key: "requires_sponsorship",
    label:
      "Will you now or in the future require visa sponsorship for employment?",
    valueType: "boolean",
    synonyms: [
      "require sponsorship",
      "need sponsorship",
      "visa sponsorship",
      "immigration sponsorship",
      "require visa",
    ],
  },
  {
    key: "salary_expectation",
    label: "Desired salary",
    valueType: "text",
    synonyms: [
      "salary expectation",
      "expected salary",
      "desired compensation",
      "compensation expectation",
      "salary requirement",
      "desired pay",
    ],
  },
  {
    key: "notice_period",
    label: "Notice period / earliest start date",
    valueType: "text",
    synonyms: [
      "notice period",
      "start date",
      "available start",
      "earliest start date",
      "when can you start",
      "availability",
    ],
  },
  {
    key: "willing_to_relocate",
    label: "Are you willing to relocate?",
    valueType: "boolean",
    synonyms: ["willing to relocate", "open to relocation", "relocate"],
  },
  {
    key: "work_arrangement",
    label: "Preferred work arrangement",
    valueType: "select",
    synonyms: ["remote", "hybrid", "onsite preference", "work preference"],
  },
  {
    key: "current_company",
    label: "Current employer",
    valueType: "text",
    synonyms: ["current company", "present employer", "current employer"],
  },
  {
    key: "current_title",
    label: "Current job title",
    valueType: "text",
    synonyms: ["current title", "present position", "current role"],
  },
  {
    key: "years_experience",
    label: "Years of relevant experience",
    valueType: "number",
    synonyms: ["years of experience", "how many years", "total experience"],
  },
  {
    key: "how_did_you_hear",
    label: "How did you hear about this role?",
    valueType: "text",
    synonyms: [
      "how did you hear",
      "referral source",
      "where did you find",
      "source",
    ],
  },
  {
    key: "referral_name",
    label: "Referred by",
    valueType: "text",
    synonyms: ["referral name", "who referred you", "employee referral"],
  },
  {
    key: "previously_employed",
    label: "Have you previously been employed by this company?",
    valueType: "boolean",
    synonyms: [
      "previously employed",
      "former employee",
      "worked here before",
      "prior employment with",
    ],
  },
  {
    key: "non_compete",
    label: "Are you subject to a non-compete agreement?",
    valueType: "boolean",
    synonyms: ["non-compete", "noncompete", "restrictive covenant"],
  },
  {
    key: "why_this_company",
    label: "Why do you want to work here?",
    valueType: "textarea",
    synonyms: [
      "why do you want to work",
      "why are you interested",
      "why this company",
      "what interests you",
    ],
  },
  {
    key: "pronouns",
    label: "Pronouns",
    valueType: "text",
    synonyms: ["pronouns", "preferred pronouns"],
  },
  // Demographic / EEO. Voluntary on every platform that asks, so these are
  // flagged sensitive and skipped unless the user opts in per-fill.
  {
    key: "eeo_gender",
    label: "Gender (EEO, voluntary)",
    valueType: "select",
    isSensitive: true,
    synonyms: ["gender", "gender identity"],
  },
  {
    key: "eeo_race",
    label: "Race / ethnicity (EEO, voluntary)",
    valueType: "select",
    isSensitive: true,
    synonyms: ["race", "ethnicity", "racial identity", "hispanic or latino"],
  },
  {
    key: "eeo_veteran",
    label: "Veteran status (EEO, voluntary)",
    valueType: "select",
    isSensitive: true,
    synonyms: ["veteran status", "protected veteran", "military service"],
  },
  {
    key: "eeo_disability",
    label: "Disability status (EEO, voluntary)",
    valueType: "select",
    isSensitive: true,
    synonyms: ["disability status", "disability", "form cc-305"],
  },
];

export const ALL_ANSWER_KEYS = [
  ...PROFILE_DERIVED_ANSWERS,
  ...DEFAULT_ANSWER_SEEDS,
].map((a) => a.key);
