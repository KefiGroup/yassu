import { db } from "./db";
import { sql } from "drizzle-orm";

async function preMigrate() {
  try {
    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'profiles' AND column_name = 'looking_for' AND data_type = 'text'
        ) THEN
          ALTER TABLE profiles ALTER COLUMN looking_for TYPE text[] USING CASE WHEN looking_for IS NULL THEN '{}'::text[] ELSE ARRAY[looking_for] END;
          ALTER TABLE profiles ALTER COLUMN looking_for SET DEFAULT '{}'::text[];
          RAISE NOTICE 'looking_for column migrated from text to text[]';
        END IF;
      END $$;
    `);
    console.log('[pre-migrate] ✓ Column type migrations completed');
  } catch (err) {
    console.error('[pre-migrate] Error:', err);
    process.exit(1);
  }
  process.exit(0);
}

preMigrate();
