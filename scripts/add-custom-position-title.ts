import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Adding custom_position_title column to resumes table...");
  await sql`
    ALTER TABLE resumes
    ADD COLUMN IF NOT EXISTS custom_position_title VARCHAR(200)
  `;

  console.log("Adding custom_position_titles column to resumes table...");
  await sql`
    ALTER TABLE resumes
    ADD COLUMN IF NOT EXISTS custom_position_titles JSONB DEFAULT '{}'
  `;

  console.log("✓ custom position title columns added");
}

run().catch(console.error);
