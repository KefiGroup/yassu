import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and } from 'drizzle-orm';
import * as schema from '../shared/schema';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const db = drizzle(pool, { schema });

async function checkAndAddAdmin() {
  try {
    // Find user by email
    const users = await db.select().from(schema.users)
      .where(eq(schema.users.email, 'paulinet77@gmail.com'));
    
    console.log('User found:', users.length > 0 ? 'YES' : 'NO');
    
    if (users.length === 0) {
      console.log('User paulinet77@gmail.com not found in database');
      await pool.end();
      return;
    }
    
    const user = users[0];
    console.log('User ID:', user.id);
    console.log('User email:', user.email);
    
    // Check existing roles
    const existingRoles = await db.select().from(schema.userRoles)
      .where(eq(schema.userRoles.userId, user.id));
    
    console.log('Existing roles:', existingRoles);
    
    // Check if admin role exists
    const hasAdminRole = existingRoles.some(r => r.role === 'admin');
    
    if (hasAdminRole) {
      console.log('✅ User already has admin role');
    } else {
      console.log('❌ User does NOT have admin role. Adding now...');
      
      // Add admin role
      await db.insert(schema.userRoles).values({
        userId: user.id,
        role: 'admin'
      });
      
      console.log('✅ Admin role added successfully!');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkAndAddAdmin();
