import { requireDatabaseUrl } from "./load-env";
import { neon } from "@neondatabase/serverless";

/**
 * Adds email/password sign-in: a password hash on users, plus the two
 * short-lived token tables that back email verification and password reset.
 *
 * Idempotent — safe to re-run. Run with:
 *   npm run db:password-auth
 */
async function run() {
  const sql = neon(requireDatabaseUrl());

  console.log("Adding users.password_hash...");
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
  `;

  console.log("Creating pending_registrations table...");
  // Signups live here until the address is proved. No users row exists for an
  // unverified email, so an address cannot be squatted ahead of its owner.
  await sql`
    CREATE TABLE IF NOT EXISTS pending_registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  console.log("Creating password_reset_tokens table...");
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      consumed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
      ON password_reset_tokens(user_id)
  `;

  console.log("\n✓ Migration complete.");
  console.log(
    "\nSessions move from the database to JWTs in this release, so everyone is\n" +
      "signed out once. The sessions table is left in place and simply unused."
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
