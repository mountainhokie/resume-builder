/**
 * Cover letter templating.
 *
 * Placeholder substitution only — the same behaviour the editor has always had,
 * lifted out of the page component so the extension's capture endpoint produces
 * identical letters to the ones you get in the UI.
 *
 * generateCoverLetter() is the single seam where AI drafting would slot in
 * later: a strategy that rewrites the body against the job description would
 * replace the substitution step and leave every caller unchanged.
 */

export type TemplateParts = {
  opening: string | null;
  body: string | null;
  closing: string | null;
};

/**
 * Used when a profile has no saved template yet, so capturing a job always
 * produces an editable draft rather than a blank letter that silently reports
 * success.
 *
 * Deliberately not written to the database. The cover letter editor migrates an
 * existing localStorage template the first time it finds no rows, and inserting
 * this would suppress that and quietly replace a real template with boilerplate.
 */
export const STARTER_TEMPLATE: TemplateParts = {
  opening:
    "Dear Hiring Manager,\n\n" +
    "I am writing to apply for the [Position] role at [Company Name]. " +
    "The position lines up closely with what I do best, and I would welcome " +
    "the chance to contribute.",
  body:
    "Across my career I have focused on the kind of work this role calls for, " +
    "and I am drawn to [Company Name] in particular. I would be glad to walk " +
    "through specific examples of how that experience applies.",
  closing: "Thank you for your consideration,",
};

export type PlaceholderValues = {
  position?: string | null;
  company?: string | null;
};

export function applyPlaceholders(
  text: string | null | undefined,
  values: PlaceholderValues
): string {
  let result = text ?? "";
  if (values.position) result = result.replaceAll("[Position]", values.position);
  if (values.company)
    result = result.replaceAll("[Company Name]", values.company);
  return result;
}

export function generateCoverLetter(
  template: TemplateParts | null,
  values: PlaceholderValues
): { opening: string; body: string; closing: string } {
  return {
    opening: applyPlaceholders(template?.opening, values),
    body: applyPlaceholders(template?.body, values),
    closing: applyPlaceholders(template?.closing, values),
  };
}

/** Matches the naming the editor uses when starting a letter from a job. */
export function coverLetterNameFor(title: string, company?: string | null) {
  return company
    ? `Cover Letter - ${company} - ${title}`
    : `Cover Letter - ${title}`;
}
