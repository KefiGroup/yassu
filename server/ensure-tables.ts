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
  } catch (error) {
    console.error('[ensureTables] Error ensuring tables:', error);
    throw error;
  }
}
