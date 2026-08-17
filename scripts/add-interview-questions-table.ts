import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating interview_questions table...");
  await sql`
    CREATE TABLE IF NOT EXISTS interview_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      answer TEXT,
      company VARCHAR(300),
      interviewer VARCHAR(200),
      type VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  console.log("✓ interview_questions table created");
}

run().catch(console.error);
