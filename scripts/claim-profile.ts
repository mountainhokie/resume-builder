import { requireDatabaseUrl } from "./load-env";
import { neon } from "@neondatabase/serverless";

/**
 * Links an existing profile — and therefore all of its jobs, resumes, cover
 * letters, interviews and interview questions — to a signed-in user account.
 *
 * Sign-in claims an unclaimed profile automatically when the provider email
 * matches the profile email. This script covers the case where it does not:
 * you sign in with a Google address that differs from the email on your
 * resume, and end up with a fresh empty profile while the real one sits
 * unclaimed.
 *
 * Nothing is copied or rewritten. Rows hang off profile_id, so re-pointing the
 * profile at a user carries the entire history with it.
 *
 *   npm run db:claim -- --list
 *   npm run db:claim -- <profile-email-or-id> <login-email>
 */

const sql = neon(requireDatabaseUrl());

/**
 * Counts everything hanging off a profile. Written out per table rather than
 * looped over a table-name list so every query stays a parameterised tagged
 * template with no interpolated identifiers.
 */
async function countsFor(profileId: string): Promise<Record<string, number>> {
  const one = async (rows: Promise<unknown>) =>
    ((await rows) as { n: number }[])[0]?.n ?? 0;

  return {
    jobs: await one(
      sql`SELECT count(*)::int AS n FROM jobs WHERE profile_id = ${profileId}`
    ),
    resumes: await one(
      sql`SELECT count(*)::int AS n FROM resumes WHERE profile_id = ${profileId}`
    ),
    cover_letters: await one(
      sql`SELECT count(*)::int AS n FROM cover_letters WHERE profile_id = ${profileId}`
    ),
    education: await one(
      sql`SELECT count(*)::int AS n FROM education WHERE profile_id = ${profileId}`
    ),
    employment: await one(
      sql`SELECT count(*)::int AS n FROM employment WHERE profile_id = ${profileId}`
    ),
    interview_questions: await one(
      sql`SELECT count(*)::int AS n FROM interview_questions WHERE profile_id = ${profileId}`
    ),
    interviews: await one(
      sql`SELECT count(*)::int AS n FROM interviews i
            JOIN jobs j ON j.id = i.job_id WHERE j.profile_id = ${profileId}`
    ),
  };
}

function summarize(counts: Record<string, number>): string {
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${n} ${t.replace(/_/g, " ")}`);
  return parts.length ? parts.join(", ") : "no records";
}

async function list() {
  const profiles = (await sql`
    SELECT p.id, p.first_name, p.last_name, p.email, p.user_id, u.email AS login_email
      FROM profiles p LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at
  `) as {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_id: string | null;
    login_email: string | null;
  }[];

  if (!profiles.length) {
    console.log("No profiles found.");
    return;
  }

  console.log(`\n${profiles.length} profile(s):\n`);
  for (const p of profiles) {
    const counts = await countsFor(p.id);
    console.log(`  ${p.first_name} ${p.last_name} <${p.email}>`);
    console.log(`    id:      ${p.id}`);
    console.log(
      `    owner:   ${p.user_id ? `${p.login_email} (claimed)` : "UNCLAIMED"}`
    );
    console.log(`    data:    ${summarize(counts)}\n`);
  }

  const users = (await sql`
    SELECT u.email, u.id, p.id AS profile_id FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id ORDER BY u.created_at
  `) as { email: string; id: string; profile_id: string | null }[];

  if (users.length) {
    console.log(`${users.length} user account(s):\n`);
    for (const u of users) {
      console.log(
        `  ${u.email} -> ${u.profile_id ? `profile ${u.profile_id}` : "no profile"}`
      );
    }
    console.log();
  }
}

async function claim(profileRef: string, loginEmail: string) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profileRef
    );

  const matches = (
    isUuid
      ? await sql`SELECT * FROM profiles WHERE id = ${profileRef}`
      : await sql`SELECT * FROM profiles WHERE email = ${profileRef}`
  ) as {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_id: string | null;
  }[];

  if (!matches.length) {
    throw new Error(`No profile found matching "${profileRef}".`);
  }
  if (matches.length > 1) {
    throw new Error(
      `"${profileRef}" matches ${matches.length} profiles. Re-run with a profile id — see --list.`
    );
  }
  const profile = matches[0];

  const users = (await sql`
    SELECT id, email FROM users WHERE lower(email) = lower(${loginEmail})
  `) as { id: string; email: string }[];
  if (!users.length) {
    throw new Error(
      `No user account for "${loginEmail}". Sign in with that provider once, then re-run.`
    );
  }
  const user = users[0];

  const counts = await countsFor(profile.id);
  console.log(
    `\nProfile: ${profile.first_name} ${profile.last_name} <${profile.email}>`
  );
  console.log(`Carrying: ${summarize(counts)}`);
  console.log(`Claiming for: ${user.email}\n`);

  if (profile.user_id === user.id) {
    console.log("Already claimed by this user — nothing to do.");
    return;
  }
  if (profile.user_id) {
    throw new Error(
      "That profile is already claimed by a different user. Reassigning it would " +
        "take data away from that account, so this script will not do it automatically."
    );
  }

  // The target user may already hold an auto-created profile from signing in
  // before this ran. It can only be removed if it is genuinely empty.
  const existing = (await sql`
    SELECT id FROM profiles WHERE user_id = ${user.id}
  `) as { id: string }[];

  if (existing.length) {
    const stale = existing[0];
    const staleCounts = await countsFor(stale.id);
    const total = Object.values(staleCounts).reduce((a, b) => a + b, 0);
    if (total > 0) {
      throw new Error(
        `${user.email} already has a profile holding ${summarize(staleCounts)}. ` +
          `Merging two populated profiles is not something this script will guess at — ` +
          `move or delete that data first.`
      );
    }
    console.log(`Removing empty auto-created profile ${stale.id}...`);
    await sql`DELETE FROM profiles WHERE id = ${stale.id}`;
  }

  await sql`
    UPDATE profiles SET user_id = ${user.id}, updated_at = NOW()
      WHERE id = ${profile.id}
  `;

  console.log(`✓ Claimed. ${user.email} now owns ${summarize(counts)}.`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === "--list" || args[0] === "-l") {
    await list();
    return;
  }
  if (args.length !== 2) {
    console.error(
      "Usage:\n" +
        "  npm run db:claim -- --list\n" +
        "  npm run db:claim -- <profile-email-or-id> <login-email>"
    );
    process.exit(1);
  }
  await claim(args[0], args[1]);
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
