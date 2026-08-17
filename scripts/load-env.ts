import { config } from "dotenv";

/**
 * Loads environment the same way Next.js does.
 *
 * `import "dotenv/config"` reads .env and nothing else, so a DATABASE_URL or
 * AUTH_SECRET kept in .env.local — where Next.js expects it, and where
 * .gitignore already excludes it — is invisible to a script. Loading both, with
 * .env.local winning, means scripts and the app always agree.
 */
config({ path: ".env" });
config({ path: ".env.local", override: true });

/** Fails with something actionable rather than a driver-level connection error. */
export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "DATABASE_URL is not set.\n\n" +
        "Add it to .env.local (or .env) in the project root:\n" +
        "  DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require\n\n" +
        "See .env.example for the full list of variables."
    );
    process.exit(1);
  }
  return url;
}
