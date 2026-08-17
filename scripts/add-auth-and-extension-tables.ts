import { requireDatabaseUrl } from "./load-env";
import { neon } from "@neondatabase/serverless";

/**
 * Adds the Auth.js tables, links profiles to users, and creates the tables the
 * Chrome extension needs (answer library, learned field mappings, cover letter
 * defaults, extension auth codes/tokens).
 *
 * Idempotent — safe to re-run. Run with:
 *   npm run db:setup
 */
async function run() {
  const sql = neon(requireDatabaseUrl());

  // --- Auth.js tables ------------------------------------------------------

  console.log("Creating users table...");
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255),
      email VARCHAR(255) NOT NULL UNIQUE,
      email_verified TIMESTAMP,
      image VARCHAR(1000),
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE
  `;

  console.log("Creating accounts table...");
  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(255) NOT NULL,
      provider VARCHAR(255) NOT NULL,
      provider_account_id VARCHAR(255) NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type VARCHAR(255),
      scope VARCHAR(255),
      id_token TEXT,
      session_state VARCHAR(255),
      PRIMARY KEY (provider, provider_account_id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON accounts(user_id)
  `;

  console.log("Creating sessions table...");
  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      session_token VARCHAR(255) PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMP NOT NULL
    )
  `;

  console.log("Creating verification_tokens table...");
  await sql`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier VARCHAR(255) NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires TIMESTAMP NOT NULL,
      PRIMARY KEY (identifier, token)
    )
  `;

  // --- Link profiles to users ---------------------------------------------

  console.log("Adding profiles.user_id...");
  await sql`
    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE
  `;
  // Unique rather than a plain index: one profile per user, enforced by the DB.
  // Postgres permits multiple NULLs, so pre-auth profiles stay valid until claimed.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id)
  `;

  // --- Cover letter templates (migrated off localStorage) ------------------

  console.log("Creating cover_letter_templates table...");
  await sql`
    CREATE TABLE IF NOT EXISTS cover_letter_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      opening TEXT,
      body TEXT,
      closing TEXT,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS cover_letter_templates_profile_name_idx
      ON cover_letter_templates(profile_id, name)
  `;
  // At most one default template per profile.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS cover_letter_templates_one_default_idx
      ON cover_letter_templates(profile_id) WHERE is_default
  `;

  // --- Autofill ------------------------------------------------------------

  console.log("Creating application_answers table...");
  await sql`
    CREATE TABLE IF NOT EXISTS application_answers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      key VARCHAR(100) NOT NULL,
      label VARCHAR(300) NOT NULL,
      value TEXT,
      value_type VARCHAR(20) NOT NULL DEFAULT 'text',
      synonyms JSONB DEFAULT '[]'::jsonb,
      is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS application_answers_profile_key_idx
      ON application_answers(profile_id, key)
  `;

  console.log("Creating field_mappings table...");
  // profile_id NULL marks a curated mapping shared with every user.
  // scope holds the ATS platform id when recognised, else the bare hostname.
  await sql`
    CREATE TABLE IF NOT EXISTS field_mappings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      scope VARCHAR(255) NOT NULL,
      scope_type VARCHAR(20) NOT NULL DEFAULT 'host',
      host VARCHAR(255),
      field_fingerprint VARCHAR(64) NOT NULL,
      answer_key VARCHAR(100) NOT NULL,
      label TEXT,
      selector TEXT,
      times_used INTEGER NOT NULL DEFAULT 0,
      last_used_at TIMESTAMP,
      curated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  // Partial rather than one composite index: Postgres treats NULLs as
  // distinct, so a plain unique over a nullable profile_id would admit
  // duplicate curated rows.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS field_mappings_owned_idx
      ON field_mappings(profile_id, scope, field_fingerprint)
      WHERE profile_id IS NOT NULL
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS field_mappings_curated_idx
      ON field_mappings(scope, field_fingerprint)
      WHERE profile_id IS NULL
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS field_mappings_lookup_idx
      ON field_mappings(profile_id, scope)
  `;

  // --- Extension auth ------------------------------------------------------

  console.log("Creating ext_auth_codes table...");
  await sql`
    CREATE TABLE IF NOT EXISTS ext_auth_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash VARCHAR(64) NOT NULL UNIQUE,
      code_challenge VARCHAR(128) NOT NULL,
      code_challenge_method VARCHAR(10) NOT NULL DEFAULT 'S256',
      redirect_uri TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      consumed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  console.log("Creating ext_refresh_tokens table...");
  await sql`
    CREATE TABLE IF NOT EXISTS ext_refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      device_label VARCHAR(200),
      expires_at TIMESTAMP NOT NULL,
      last_used_at TIMESTAMP,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS ext_refresh_tokens_user_idx
      ON ext_refresh_tokens(user_id)
  `;

  // --- Report --------------------------------------------------------------

  const unclaimed = await sql`
    SELECT id, first_name, last_name, email FROM profiles WHERE user_id IS NULL
  `;

  console.log("\n✓ Migration complete.");
  if (unclaimed.length > 0) {
    console.log(
      `\n${unclaimed.length} profile(s) not yet linked to a user account:`
    );
    for (const p of unclaimed) {
      console.log(`  - ${p.first_name} ${p.last_name} <${p.email}>`);
    }
    console.log(
      "\nThese are claimed automatically on first sign-in when the Google/GitHub/LinkedIn\n" +
        "email matches the profile email. Otherwise run:\n" +
        "  npm run db:claim -- <profile-email> <login-email>"
    );
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
