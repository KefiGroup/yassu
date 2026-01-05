import dotenv from "dotenv";
dotenv.config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";
import { users, profiles, userRoles, ideas, teamMembers, joinRequests } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Use Supabase connection string from environment
const connectionString = process.env.DATABASE_URL || "";

if (!connectionString) {
  console.error("DATABASE_URL not found in environment");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function resetAccount(email: string) {
  console.log(`\n🔄 Resetting account for: ${email}`);
  
  try {
    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    
    // Reset password to a known value
    const newPassword = "Peilin7$";
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, user.id));
    
    console.log(`✅ Password reset to: ${newPassword}`);
    
    // Check profile
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    
    if (profile) {
      console.log(`✅ Profile exists: ${profile.fullName || 'No name'}`);
      console.log(`   - Onboarding completed: ${profile.onboardingCompleted}`);
      console.log(`   - Verification status: ${profile.verificationStatus}`);
    } else {
      console.log(`⚠️  No profile found - creating one`);
      await db.insert(profiles).values({
        userId: user.id,
        email: user.email,
        fullName: user.fullName || email.split('@')[0],
        onboardingCompleted: true,
        verificationStatus: 'verified'
      });
      console.log(`✅ Profile created`);
    }
    
    // Check roles
    const roles = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
    console.log(`✅ User roles: ${roles.map(r => r.role).join(', ') || 'none'}`);
    
    // Add admin role if not present
    const hasAdminRole = roles.some(r => r.role === 'admin');
    if (!hasAdminRole) {
      await db.insert(userRoles).values({
        userId: user.id,
        role: 'admin'
      });
      console.log(`✅ Added admin role`);
    }
    
    console.log(`\n✅ Account reset complete!`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    
  } catch (error) {
    console.error("❌ Error resetting account:", error);
  }
}

async function grantSuperadmin(email: string) {
  console.log(`\n👑 Granting superadmin permissions to: ${email}`);
  
  try {
    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }
    
    // Check current roles
    const roles = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
    const hasAdminRole = roles.some(r => r.role === 'admin');
    
    if (!hasAdminRole) {
      await db.insert(userRoles).values({
        userId: user.id,
        role: 'admin'
      });
      console.log(`✅ Added admin role`);
    } else {
      console.log(`✅ Already has admin role`);
    }
    
    console.log(`\n✅ Superadmin permissions granted!`);
    console.log(`   User can now:`);
    console.log(`   - Delete any idea`);
    console.log(`   - Delete any collaborator`);
    console.log(`   - Access admin panel`);
    
  } catch (error) {
    console.error("❌ Error granting superadmin:", error);
  }
}

async function listUserData(email: string) {
  console.log(`\n📊 Listing data for: ${email}`);
  
  try {
    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }
    
    console.log(`\n👤 User: ${user.email} (ID: ${user.id})`);
    
    // Get profile
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    if (profile) {
      console.log(`\n📝 Profile:`);
      console.log(`   - Full Name: ${profile.fullName || 'Not set'}`);
      console.log(`   - University: ${profile.universityId || 'Not set'}`);
      console.log(`   - Onboarding: ${profile.onboardingCompleted ? 'Complete' : 'Incomplete'}`);
      console.log(`   - Verification: ${profile.verificationStatus}`);
    }
    
    // Get roles
    const roles = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
    console.log(`\n👑 Roles: ${roles.map(r => r.role).join(', ') || 'none'}`);
    
    // Get ideas
    const userIdeas = await db.select().from(ideas).where(eq(ideas.createdBy, user.id));
    console.log(`\n💡 Ideas (${userIdeas.length}):`);
    userIdeas.forEach(idea => {
      console.log(`   - ${idea.title} (${idea.stage}) - ${idea.isPublic ? 'Public' : 'Private'}`);
    });
    
    // Get team memberships
    const memberships = await db.select().from(teamMembers).where(eq(teamMembers.userId, user.id));
    console.log(`\n👥 Team Memberships: ${memberships.length}`);
    
    // Get join requests
    const requests = await db.select().from(joinRequests).where(eq(joinRequests.userId, user.id));
    console.log(`\n📨 Join Requests: ${requests.length}`);
    
  } catch (error) {
    console.error("❌ Error listing user data:", error);
  }
}

async function deleteAllIdeas(email: string) {
  console.log(`\n🗑️  Deleting all ideas for: ${email}`);
  
  try {
    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }
    
    // Get all user's ideas
    const userIdeas = await db.select().from(ideas).where(eq(ideas.createdBy, user.id));
    console.log(`\n📊 Found ${userIdeas.length} ideas to delete`);
    
    if (userIdeas.length === 0) {
      console.log(`✅ No ideas to delete`);
      return;
    }
    
    // Import schema tables
    const { ideaWorkflowSections, ideaTags, teamInvites, workflowRuns, workflowArtifacts, teams } = schema;
    
    // Delete each idea with all related records
    for (const idea of userIdeas) {
      console.log(`   Deleting: ${idea.title} (${idea.id})`);
      
      // Get workflow runs for this idea first
      const runs = await db.select().from(workflowRuns).where(eq(workflowRuns.ideaId, idea.id));
      
      // Delete workflow artifacts for each run
      for (const run of runs) {
        await db.delete(workflowArtifacts).where(eq(workflowArtifacts.workflowRunId, run.id));
      }
      
      // Delete related records (foreign key constraints order matters)
      await db.delete(ideaWorkflowSections).where(eq(ideaWorkflowSections.ideaId, idea.id));
      await db.delete(ideaTags).where(eq(ideaTags.ideaId, idea.id));
      await db.delete(teamInvites).where(eq(teamInvites.ideaId, idea.id));
      await db.delete(joinRequests).where(eq(joinRequests.ideaId, idea.id));
      await db.delete(workflowRuns).where(eq(workflowRuns.ideaId, idea.id));
      await db.delete(teams).where(eq(teams.ideaId, idea.id));
      
      // Finally delete the idea itself
      await db.delete(ideas).where(eq(ideas.id, idea.id));
      
      console.log(`   ✅ Deleted ${idea.title}`);
    }
    
    console.log(`\n✅ Successfully deleted ${userIdeas.length} ideas!`);
    
  } catch (error) {
    console.error("❌ Error deleting ideas:", error);
  }
}

async function main() {
  const command = process.argv[2];
  const email = process.argv[3] || "paulinet77@gmail.com";
  
  console.log(`\n🔧 Yassu Database Admin Tool`);
  console.log(`================================`);
  
  switch (command) {
    case "reset":
      await resetAccount(email);
      break;
    case "superadmin":
      await grantSuperadmin(email);
      break;
    case "list":
      await listUserData(email);
      break;
    case "delete-ideas":
      await deleteAllIdeas(email);
      break;
    case "full":
      await resetAccount(email);
      await grantSuperadmin(email);
      await listUserData(email);
      break;
    default:
      console.log(`\nUsage:`);
      console.log(`  npm run db-admin reset [email]       - Reset account password`);
      console.log(`  npm run db-admin superadmin [email]  - Grant superadmin permissions`);
      console.log(`  npm run db-admin list [email]        - List user data`);
      console.log(`  npm run db-admin delete-ideas [email] - Delete all user's ideas`);
      console.log(`  npm run db-admin full [email]        - Do all of the above`);
      console.log(`\nDefault email: paulinet77@gmail.com`);
      break;
  }
  
  await client.end();
  process.exit(0);
}

main();
