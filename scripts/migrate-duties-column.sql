-- Step 1: Add a temporary jsonb column
ALTER TABLE employment ADD COLUMN duties_new jsonb DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing text duties to jsonb array of {id, text} objects
-- Each non-empty line becomes a separate duty entry with a generated UUID
UPDATE employment
SET duties_new = (
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
WHERE duties IS NOT NULL AND trim(duties) <> '';

-- Step 3: Drop the old text column
ALTER TABLE employment DROP COLUMN duties;

-- Step 4: Rename the new column
ALTER TABLE employment RENAME COLUMN duties_new TO duties;

-- Step 5: Add selected_duties column to resumes if it doesn't exist
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS selected_duties jsonb DEFAULT '[]'::jsonb;

-- Step 6: Populate selected_duties for existing resumes (select all duties by default)
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
WHERE selected_duties = '[]'::jsonb OR selected_duties IS NULL;
