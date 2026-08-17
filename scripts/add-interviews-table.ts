import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Creating interviews table...");
  await sql`
    CREATE TABLE IF NOT EXISTS interviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      date VARCHAR(10) NOT NULL,
      interviewer VARCHAR(200),
      type VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;

  console.log("✓ interviews table created");
}

run().catch(console.error);
