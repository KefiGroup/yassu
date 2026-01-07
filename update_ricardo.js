import { db } from './server/db.ts';
import { profiles, users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function updateRicardo() {
  try {
    // First find the user ID
    const userResult = await db.select().from(users).where(eq(users.email, 'rmazzi@gmail.com'));
    if (!userResult || userResult.length === 0) {
      console.error('❌ User not found with email: rmazzi@gmail.com');
      process.exit(1);
    }
    const userId = userResult[0].id;
    
    // Update the profile
    const result = await db.update(profiles)
      .set({
        fullName: 'Ricardo Mazzi',
        linkedinUrl: 'https://www.linkedin.com/in/ricardomazzi/',
        bio: 'B2C and B2B marketing executive, interactive media strategist, social media marketer, lead generation, front-end web developer, and project manager. Interested in cutting edge technologies and providing practical revenue-generating solutions for small to large businesses. As a Fractional CMO, Ricardo helps healthcare companies with their marketing strategy and execution, bringing years of expertise in delivering measurable results.',
        avatarUrl: 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663277157978/bgWDanBYHZbslGUP.png'
      })
      .where(eq(profiles.userId, userId));
    
    console.log('✅ Ricardo Mazzi profile updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    process.exit(1);
  }
}

updateRicardo();
