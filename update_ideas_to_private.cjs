const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:UQVjevHaGDunjzEbxpcadpcopFvysZzK@autorack.proxy.rlwy.net:43070/railway'
});

async function updateIdeasToPrivate() {
  try {
    console.log('Updating existing ideas to private (is_public = false)...');
    
    const result = await pool.query(`
      UPDATE ideas 
      SET is_public = false 
      WHERE user_id = 1
      RETURNING id, title, is_public;
    `);
    
    console.log(`✓ Updated ${result.rowCount} ideas to private:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.title} (ID: ${row.id}) - isPublic: ${row.is_public}`);
    });
    
    await pool.end();
    console.log('\n✓ Migration completed successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

updateIdeasToPrivate();
