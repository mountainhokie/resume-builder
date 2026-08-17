import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Checking current column type...");
  const colCheck = await sql`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'employment' AND column_name = 'duties'
  `;

  if (colCheck.length === 0) {
    console.log("No duties column found — checking if duties_new exists from partial migration...");
    const newColCheck = await sql`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'employment' AND column_name = 'duties_new'
    `;
    if (newColCheck.length > 0) {
      console.log("Found duties_new column, renaming to duties...");
      await sql`ALTER TABLE employment RENAME COLUMN duties_new TO duties`;
      console.log("✓ Renamed duties_new to duties");
    }
  } else if (colCheck[0].data_type === "jsonb") {
    console.log("duties column is already jsonb — nothing to do.");
  } else {
    console.log(`duties column is '${colCheck[0].data_type}' — converting to jsonb...`);

    console.log("Step 1: Adding temporary duties_jsonb column...");
    await sql`ALTER TABLE employment ADD COLUMN IF NOT EXISTS duties_jsonb jsonb DEFAULT '[]'::jsonb`;

    console.log("Step 2: Converting text duties to jsonb array...");
    await sql`
      UPDATE employment
      SET duties_jsonb = (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', gen_random_uuid()::text,
              'text', regexp_replace(trim(line), '^[-•*]\s*', '', 'g')
            )
          ),
          '[]'::jsonb
        )
        FROM unnest(string_to_array(duties, E'\n')) AS line
        WHERE trim(line) <> ''
      )
      WHERE duties IS NOT NULL AND trim(duties) <> ''
    `;

    console.log("Step 3: Dropping old text column...");
    await sql`ALTER TABLE employment DROP COLUMN duties`;

    console.log("Step 4: Renaming new column...");
    await sql`ALTER TABLE employment RENAME COLUMN duties_jsonb TO duties`;

    console.log("✓ Duties column converted to jsonb");
  }

  console.log("\nStep 5: Adding selected_duties to resumes...");
  await sql`ALTER TABLE resumes ADD COLUMN IF NOT EXISTS selected_duties jsonb DEFAULT '[]'::jsonb`;

  console.log("Step 6: Populating selected_duties for existing resumes...");
  await sql`
    UPDATE resumes r
    SET selected_duties = (
      SELECT COALESCE(
        jsonb_agg(duty->>'id'),
        '[]'::jsonb
      )
      FROM employment e,
           jsonb_array_elements(e.duties) AS duty
      WHERE e.id::text = ANY(
        SELECT jsonb_array_elements_text(r.selected_employment)
      )
    )
    WHERE selected_duties = '[]'::jsonb OR selected_duties IS NULL
  `;

  console.log("\n✓ Migration complete! Now run: npm run db:push");
}

runMigration().catch(console.error);
