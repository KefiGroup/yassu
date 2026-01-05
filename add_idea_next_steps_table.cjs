const { Client } = require('pg');

const client = new Client({
  host: 'postgres-production-7ae5.up.railway.app',
  port: 5432,
  user: 'postgres',
  password: 'UQVjevHaGDunjzEbxpcadpcopFvysZzK',
  database: 'railway',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('Connecting to production database...');
    await client.connect();
    
    console.log('Creating idea_next_steps table...');
    await client.query(`
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
    console.log('✓ idea_next_steps table created');
    
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_idea_next_steps_idea_id ON idea_next_steps(idea_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_idea_next_steps_created_at ON idea_next_steps(created_at);
    `);
    console.log('✓ Indexes created');
    
    // Verify table exists
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'idea_next_steps'
      ORDER BY ordinal_position;
    `);
    
    console.log('Verifying idea_next_steps table columns:');
    console.log(result.rows);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

migrate();
