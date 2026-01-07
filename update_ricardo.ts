import { db } from './server/db';
import { users, profiles } from './shared/schema';
import { eq } from 'drizzle-orm';

async function updateRicardo() {
  try {
    console.log('🔍 Looking for user with email: rmazzi@gmail.com');
    
    // First find the user ID
    const userResult = await db.select().from(users).where(eq(users.email, 'rmazzi@gmail.com'));
    
    if (!userResult || userResult.length === 0) {
      console.error('❌ User not found with email: rmazzi@gmail.com');
      process.exit(1);
    }
    
    const userId = userResult[0].id;
    console.log(`✅ Found user ID: ${userId}`);
    
    // Update the profile
    const result = await db.update(profiles)
      .set({
        fullName: 'Ricardo Mazzi',
        linkedinUrl: 'https://www.linkedin.com/in/ricardomazzi/',
        bio: 'B2C and B2B marketing executive, interactive media strategist, social media marketer, lead generation, front-end web developer, and project manager. Interested in cutting edge technologies and providing practical revenue-generating solutions for small to large businesses. As a Fractional CMO, Ricardo helps healthcare companies with their marketing strategy and execution, bringing years of expertise in delivering measurable results.',
        avatarUrl: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663277157978/bgWDanBYHZbslGUP.png'
      })
      .where(eq(profiles.userId, userId))
      .returning();
    
    console.log('✅ Ricardo Mazzi profile updated successfully!');
    console.log('Updated profile:', result[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    process.exit(1);
  }
}

updateRicardo();
