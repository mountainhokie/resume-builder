/**
 * Deciding whether two company names refer to the same employer.
 *
 * Job boards write the same company a dozen ways — "Acme, Inc.", "ACME Inc",
 * "The Acme Company" — so a plain string comparison would miss most repeat
 * applications, which is the entire point of the check.
 *
 * Only true legal-form suffixes are stripped. Descriptive words like Group,
 * Labs or Technologies are left alone: "Acme Labs" and "Acme" are frequently
 * different employers, and wrongly telling someone they have applied before is
 * worse than staying quiet.
 */

/** Legal forms, not descriptive words. */
const LEGAL_SUFFIXES = new Set([
  "inc",
  "incorporated",
  "llc",
  "llp",
  "lp",
  "ltd",
  "limited",
  "corp",
  "corporation",
  "co",
  "company",
  "plc",
  "gmbh",
  "ag",
  "nv",
  "bv",
  "sa",
  "sarl",
  "sas",
  "srl",
  "spa",
  "ab",
  "as",
  "aps",
  "oy",
  "oyj",
  "pty",
  "pte",
  "kk",
  "kgaa",
]);

export function normalizeCompany(raw: string): string {
  let value = (raw ?? "")
    .toLowerCase()
    // Fold accents to their base letters before dropping non-ASCII, so
    // "Nestlé" becomes "nestle" rather than being torn into "nestl".
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[&＆]/g, " and ")
    // Strip punctuation but keep word boundaries.
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!value) return "";

  // "The Acme Company" and "Acme" should meet.
  value = value.replace(/^the\s+/, "");

  const tokens = value.split(/\s+/);
  // Trailing legal forms, and any conjunction left stranded by removing one
  // ("Acme & Co" would otherwise normalise to "acme and").
  while (
    tokens.length > 1 &&
    (LEGAL_SUFFIXES.has(tokens[tokens.length - 1]) ||
      tokens[tokens.length - 1] === "and")
  ) {
    tokens.pop();
  }
  return tokens.join(" ");
}

export type CompanyMatchKind = "exact" | "similar";

/**
 * How two names relate, or null when they are unrelated.
 *
 * "similar" means one name's words are all contained in the other's — "Acme"
 * against "Acme Technologies". Reported separately from an exact match so the
 * user can judge it rather than being told flatly that they have applied there.
 * A single short token is not enough to claim a relationship, which keeps
 * "Meta" away from "Meta Platforms Data" style coincidences.
 */
export function compareCompanies(
  a: string,
  b: string
): CompanyMatchKind | null {
  const left = normalizeCompany(a);
  const right = normalizeCompany(b);
  if (!left || !right) return null;
  if (left === right) return "exact";

  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  const [smaller, larger] =
    leftTokens.size <= rightTokens.size
      ? [leftTokens, rightTokens]
      : [rightTokens, leftTokens];

  const everyWordShared = [...smaller].every((token) => larger.has(token));
  if (!everyWordShared) return null;

  // Require something substantial in common; two-letter overlaps are noise.
  const hasDistinctiveToken = [...smaller].some((token) => token.length >= 3);
  return hasDistinctiveToken ? "similar" : null;
}
