import { db } from "./db";
import { sql } from "drizzle-orm";

export async function ensureTables() {
  try {
    console.log('[ensureTables] Checking if idea_next_steps table exists...');
    
    // Create idea_next_steps table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS idea_next_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        estimated_time TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create indexes if they don't exist
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_idea_next_steps_idea_id ON idea_next_steps(idea_id);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_idea_next_steps_created_at ON idea_next_steps(created_at);
    `);
    
    console.log('[ensureTables] ✓ idea_next_steps table verified/created');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    console.log('[ensureTables] ✓ session table verified/created');

    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_role') THEN
          CREATE TYPE group_role AS ENUM ('owner', 'admin', 'member', 'judge');
        END IF;
      END $$;
    `);
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_invite_status') THEN
          CREATE TYPE group_invite_status AS ENUM ('pending', 'accepted', 'expired');
        END IF;
      END $$;
    `);
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_application_status') THEN
          CREATE TYPE group_application_status AS ENUM ('pending', 'approved', 'rejected');
        END IF;
      END $$;
    `);
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'draft' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'group_application_status')) THEN
          ALTER TYPE group_application_status ADD VALUE 'draft' BEFORE 'pending';
        END IF;
      END $$;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        primary_color TEXT,
        accent_color TEXT,
        logo_url TEXT,
        university_id UUID REFERENCES universities(id),
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role group_role NOT NULL DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        invited_by INTEGER REFERENCES users(id),
        status group_invite_status NOT NULL DEFAULT 'pending',
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        motivation TEXT,
        status group_application_status NOT NULL DEFAULT 'pending',
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS group_idea_ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
        rated_by INTEGER NOT NULL REFERENCES users(id),
        score INTEGER NOT NULL,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_group_idea_ratings_unique ON group_idea_ratings(group_id, idea_id, rated_by);
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TYPE group_role ADD VALUE IF NOT EXISTS 'judge';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS application_questions JSONB`);
    await db.execute(sql`ALTER TABLE group_applications ADD COLUMN IF NOT EXISTS answers JSONB`);
    await db.execute(sql`ALTER TABLE group_applications ADD COLUMN IF NOT EXISTS project_title TEXT`);
    await db.execute(sql`ALTER TABLE group_applications ADD COLUMN IF NOT EXISTS university_name TEXT`);
    await db.execute(sql`ALTER TABLE group_applications ADD COLUMN IF NOT EXISTS graduation_year TEXT`);
    await db.execute(sql`ALTER TABLE group_applications ADD COLUMN IF NOT EXISTS major TEXT`);
    await db.execute(sql`ALTER TABLE group_applications ADD COLUMN IF NOT EXISTS team_emails JSONB`);
    await db.execute(sql`ALTER TABLE group_applications ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false`);

    // NOTE: Bruin group description and application_questions are managed by admins
    // through the Group Admin UI. Do NOT overwrite them on startup.

    console.log('[ensureTables] ✓ group tables verified/created');

    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS redirect_url TEXT`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS submission_message TEXT`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS submission_file_url TEXT`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMP`);
    await db.execute(sql`ALTER TABLE groups ADD COLUMN IF NOT EXISTS rubric_enabled BOOLEAN NOT NULL DEFAULT false`);

    await db.execute(sql`ALTER TABLE group_idea_ratings ADD COLUMN IF NOT EXISTS score_problem INTEGER`);
    await db.execute(sql`ALTER TABLE group_idea_ratings ADD COLUMN IF NOT EXISTS score_solution INTEGER`);
    await db.execute(sql`ALTER TABLE group_idea_ratings ADD COLUMN IF NOT EXISTS score_audience INTEGER`);
    await db.execute(sql`ALTER TABLE group_idea_ratings ADD COLUMN IF NOT EXISTS score_innovation INTEGER`);
    await db.execute(sql`ALTER TABLE group_idea_ratings ADD COLUMN IF NOT EXISTS score_clarity INTEGER`);

    // Enable the rubric for the Bruin group (one-time, idempotent)
    await db.execute(sql`UPDATE groups SET rubric_enabled = true WHERE slug = 'bruin' AND rubric_enabled = false`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        email_type TEXT,
        status TEXT NOT NULL DEFAULT 'sent',
        error_message TEXT,
        html_body TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS html_body TEXT`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC)`);
    console.log('[ensureTables] ✓ email_logs table verified/created');
  } catch (error) {
    console.error('[ensureTables] Error ensuring tables:', error);
    throw error;
  }
}
