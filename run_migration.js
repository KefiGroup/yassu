import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// import * as schema from './shared/schema.js';

// Production database URL
const DATABASE_URL = 'postgresql://postgres:UQVjevHaGDunjzEbxpcadpcopFvysZzK@turntable.proxy.rlwy.net:56748/railway';

async function runMigration() {
  console.log('Connecting to production database...');
  
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  try {
    console.log('Adding missing columns to profiles table...');
    await client`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS headline TEXT,
      ADD COLUMN IF NOT EXISTS looking_for TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS experience TEXT,
      ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS projects_completed INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS endorsements INTEGER DEFAULT 0
    `;
    console.log('✓ Profiles table updated');

    console.log('Adding missing columns to join_requests table...');
    await client`
      ALTER TABLE join_requests
      ADD COLUMN IF NOT EXISTS motivation TEXT,
      ADD COLUMN IF NOT EXISTS role TEXT,
      ADD COLUMN IF NOT EXISTS time_commitment TEXT,
      ADD COLUMN IF NOT EXISTS experience TEXT
    `;
    console.log('✓ Join_requests table updated');

    console.log('\nVerifying profiles table columns...');
    const profilesColumns = await client`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'profiles'
      AND column_name IN ('headline', 'looking_for', 'experience', 'reputation_score', 'projects_completed', 'endorsements')
      ORDER BY column_name
    `;
    console.log('Profiles columns:', profilesColumns);

    console.log('\nVerifying join_requests table columns...');
    const joinRequestsColumns = await client`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'join_requests'
      AND column_name IN ('motivation', 'role', 'time_commitment', 'experience')
      ORDER BY column_name
    `;
    console.log('Join_requests columns:', joinRequestsColumns);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);
