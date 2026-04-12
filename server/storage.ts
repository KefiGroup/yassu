import crypto from "crypto";
import { db } from "./db";
import { eq, desc, and, or, sql, inArray } from "drizzle-orm";
import * as schema from "../shared/schema";
import type { 
  User, Profile, Idea, Team, Project, University, 
  WorkflowRun, WorkflowArtifact, Notification, UserRole, InsertUser,
  JoinRequest, TeamInvite, IdeaWorkflowSection, ProfileBadge, Connection
} from "../shared/schema";

export interface ProfileWithMatchingSkills extends Profile {
  matchingSkills: string[];
  matchCount: number;
}

export interface IdeaWithMatchingSkills {
  idea: Idea;
  matchingSkills: string[];
  matchCount: number;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  createPasswordResetToken(userId: number): Promise<string>;
  validateResetToken(token: string): Promise<User | null>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  
  getProfile(userId: number): Promise<Profile | undefined>;
  updateProfile(userId: number, data: Partial<Profile>): Promise<Profile | undefined>;
  createProfile(userId: number, data: Partial<Profile>): Promise<Profile>;
  findProfilesBySkills(skills: string[], excludeUserId?: number): Promise<ProfileWithMatchingSkills[]>;
  findIdeasBySkills(skills: string[], excludeUserId?: number): Promise<IdeaWithMatchingSkills[]>;
  getProfilesByYassuRole(role: "ambassador" | "advisor"): Promise<Profile[]>;
  getAllUsersForMatching(): Promise<any[]>;
  
  getUserRoles(userId: number): Promise<UserRole[]>;
  addUserRole(userId: number, role: string): Promise<void>;
  
  getUniversities(): Promise<University[]>;
  getUniversity(id: string): Promise<University | undefined>;
  
  getIdeas(userId?: number): Promise<Idea[]>;
  getIdeasWithCreators(): Promise<(Idea & { creatorName: string | null; creatorAvatarUrl: string | null })[]>;
  getIdea(id: string): Promise<Idea | undefined>;
  createIdea(data: Partial<Idea>): Promise<Idea>;
  updateIdea(id: string, data: Partial<Idea>): Promise<Idea | undefined>;
  deleteIdea(id: string): Promise<void>;
  
  getIdeaTags(ideaId: string): Promise<{ tag: string }[]>;
  addIdeaTag(ideaId: string, tag: string): Promise<void>;
  
  getIndustries(): Promise<schema.Industry[]>;
  seedIndustries(): Promise<void>;
  addIdeaIndustries(ideaId: string, industryIds: number[]): Promise<void>;
  getIdeaIndustries(ideaId: string): Promise<schema.Industry[]>;
  removeIdeaIndustries(ideaId: string): Promise<void>;
  getProfileIndustries(profileId: number): Promise<schema.Industry[]>;
  setProfileIndustries(profileId: number, industryIds: number[]): Promise<void>;
  
  getTeams(userId?: number): Promise<Team[]>;
  getUserTeams(userId: number): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(data: Partial<Team>): Promise<Team>;
  
  getProjects(userId?: number): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(data: Partial<Project>): Promise<Project>;
  
  getWorkflowRuns(userId: number): Promise<WorkflowRun[]>;
  getWorkflowRun(id: string): Promise<WorkflowRun | undefined>;
  createWorkflowRun(data: Partial<WorkflowRun>): Promise<WorkflowRun>;
  updateWorkflowRun(id: string, data: Partial<WorkflowRun>): Promise<void>;
  
  getWorkflowArtifacts(runId: string): Promise<WorkflowArtifact[]>;
  createWorkflowArtifact(data: Partial<WorkflowArtifact>): Promise<WorkflowArtifact>;
  
  getNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  createNotification(data: { userId: number; type: string; title: string; message?: string; link?: string }): Promise<Notification>;

  getUniversityResources(universityId: string): Promise<any[]>;
  
  // User's own ideas
  getUserIdeas(userId: number): Promise<Idea[]>;
  
  // Join requests for user's ideas
  getJoinRequestsForUserIdeas(userId: number): Promise<(JoinRequest & { requester: Profile; idea: Idea })[]>;
  createJoinRequest(data: Partial<JoinRequest>): Promise<JoinRequest>;
  updateJoinRequest(id: string, data: Partial<JoinRequest>): Promise<JoinRequest | undefined>;
  
  // Team invites
  getTeamInvitesFromUser(userId: number): Promise<TeamInvite[]>;
  createTeamInvite(data: Partial<TeamInvite>): Promise<TeamInvite>;
  
  // Potential team members (advisors/ambassadors for inviting)
  getPotentialTeamMembers(excludeUserId: number, ideaId?: string): Promise<Profile[]>;
  
  // Editable workflow sections for business plans
  getIdeaWorkflowSections(ideaId: string): Promise<IdeaWorkflowSection[]>;
  getIdeaWorkflowSection(ideaId: string, sectionType: string): Promise<IdeaWorkflowSection | undefined>;
  upsertIdeaWorkflowSection(ideaId: string, sectionType: string, content: string, aiGenerated?: boolean): Promise<IdeaWorkflowSection>;
  
  // Profile badges (awarded by superadmin)
  getUserBadges(userId: number): Promise<ProfileBadge[]>;
  awardBadge(userId: number, badgeType: "ambassador" | "advisor", awardedBy: number): Promise<ProfileBadge>;
  revokeBadge(userId: number, badgeType: "ambassador" | "advisor"): Promise<void>;
  getAllProfiles(): Promise<Profile[]>;
  getProfilesWithBadges(): Promise<(Profile & { badges: ProfileBadge[] })[]>;
  
  // Admin functions
  isSuperadmin(userId: number): Promise<boolean>;
  getAllIdeasAdmin(): Promise<Idea[]>;
  getAdmins(): Promise<{ userId: number; email: string; fullName: string | null }[]>;
  grantAdminRole(userId: number): Promise<void>;
  revokeAdminRole(userId: number): Promise<void>;
  getAllUsers(): Promise<(User & { profile?: Profile; roles: string[] })[]>;
  getAllIdeas(): Promise<Idea[]>;
  getAllTeamMembers(): Promise<any[]>;
  deleteUser(userId: number): Promise<void>;
  deleteTeamMember(memberId: string): Promise<void>;
  
  // Connection system (LinkedIn/Facebook style)
  sendConnectionRequest(requesterId: number, recipientId: number, message?: string): Promise<Connection>;
  getConnectionStatus(userId1: number, userId2: number): Promise<{ status: string; connection?: Connection } | null>;
  getPendingConnectionRequests(userId: number, direction: 'received' | 'sent'): Promise<(Connection & { profile: Profile })[]>;
  getConnections(userId: number): Promise<(Connection & { profile: Profile })[]>;
  acceptConnection(connectionId: string, userId: number): Promise<Connection | undefined>;
  acceptConnectionByToken(requestId: string, token: string): Promise<Connection | undefined>;
  getConnectionByToken(requestId: string, token: string): Promise<Connection | undefined>;
  rejectConnectionByToken(requestId: string, token: string): Promise<Connection | undefined>;
  rejectConnection(connectionId: string, userId: number): Promise<Connection | undefined>;
  cancelConnection(connectionId: string, userId: number): Promise<void>;
  removeConnection(connectionId: string, userId: number): Promise<void>;
  
  // Collaborators marketplace
  getCollaborators(filters: {
    roles?: string[];
    skills?: string[];
    interests?: string[];
    clubType?: string;
    search?: string;
  }): Promise<(Profile & { 
    roles: string[]; 
    university?: { name: string; shortName: string | null } | null;
  })[]>;
  
  // Public profile view
  getPublicProfile(userId: number): Promise<{
    profile: Profile;
    university: { name: string; shortName: string | null } | null;
    roles: string[];
    badges: ProfileBadge[];
    ideas: Idea[];
  } | null>;
  
  // Weekly digest methods
  getNewIdeasForWeek(startDate: Date, endDate: Date): Promise<Idea[]>;
  getUserActivitySummary(userId: number, startDate: Date, endDate: Date): Promise<{
    ideasCreated: number;
    invitesReceived: number;
    teamsJoined: number;
  }>;
  getPlatformStats(): Promise<{
    totalIdeas: number;
    totalUsers: number;
    newUsersThisWeek: number;
  }>;
  getSkillMatchesForUser(userId: number, startDate: Date, endDate: Date): Promise<Array<{
    idea: Idea;
    matchingSkills: string[];
  }>>;
  logDigestEmailSent(userId: number, weekStart: Date, weekEnd: Date, ideasCount: number, matchesCount: number): Promise<void>;
  getUsersForDigest(): Promise<(User & { profile: Profile | null })[]>;

  
  // Portfolio
  getUserPortfolio(userId: number): Promise<{
    createdIdeas: (Idea & { teamSize: number })[];
    collaboratingIdeas: (Idea & { role: string | null; joinedAt: Date | null; teamSize: number })[];
  }>;
  
  // Groups
  getGroups(): Promise<schema.Group[]>;
  getGroup(id: string): Promise<schema.Group | undefined>;
  getGroupBySlug(slug: string): Promise<schema.Group | undefined>;
  createGroup(data: schema.InsertGroup): Promise<schema.Group>;
  updateGroup(id: string, data: Partial<schema.Group>): Promise<schema.Group | undefined>;
  deleteGroup(id: string): Promise<void>;
  getGroupMembers(groupId: string): Promise<(schema.GroupMember & { user: User; profile: Profile | null })[]>;
  addGroupMember(groupId: string, userId: number, role: "owner" | "admin" | "member" | "judge"): Promise<schema.GroupMember>;
  updateGroupMemberRole(groupId: string, userId: number, role: "owner" | "admin" | "member" | "judge"): Promise<schema.GroupMember | undefined>;
  removeGroupMember(groupId: string, userId: number): Promise<void>;
  isGroupAdmin(groupId: string, userId: number): Promise<boolean>;
  getUserGroups(userId: number): Promise<(schema.Group & { role: string })[]>;
  getGroupIdeas(groupId: string): Promise<schema.Idea[]>;
  getGroupStats(groupId: string): Promise<{ memberCount: number; ideaCount: number; pendingInviteCount: number }>;
  createGroupInvite(data: schema.InsertGroupInvite): Promise<schema.GroupInvite>;
  getGroupInvites(groupId: string): Promise<(schema.GroupInvite & { inviterName: string | null })[]>;
  getGroupInviteByToken(token: string): Promise<(schema.GroupInvite & { group: schema.Group }) | undefined>;
  getPendingGroupInvitesByEmail(email: string): Promise<schema.GroupInvite[]>;
  acceptGroupInvite(token: string, userId: number): Promise<void>;
  revokeGroupInvite(inviteId: string, groupId: string): Promise<void>;
  updateGroupInvite(inviteId: string, data: Partial<schema.GroupInvite>): Promise<schema.GroupInvite | undefined>;
  transferGroupOwnership(groupId: string, currentOwnerId: number, newOwnerId: number): Promise<void>;
  
  // Group Applications
  getGroupApplications(groupId: string): Promise<(schema.GroupApplication & { user: User; profile: Profile | null })[]>;
  getUserApplications(userId: number): Promise<(schema.GroupApplication & { groupName: string; groupSlug: string })[]>;
  getUserApplicationForGroup(userId: number, groupId: string): Promise<schema.GroupApplication | undefined>;
  createGroupApplication(data: schema.InsertGroupApplication): Promise<schema.GroupApplication>;
  updateGroupApplication(id: string, status: "approved" | "rejected", reviewedBy: number): Promise<schema.GroupApplication | undefined>;
  updateGroupApplicationAnswers(id: string, answers: { question: string; answer: string }[], motivation: string, projectTitle?: string, teamEmails?: string[], extra?: { universityName?: string; graduationYear?: string; major?: string }): Promise<schema.GroupApplication | undefined>;
  getApplicationsByTeamEmail(email: string): Promise<schema.GroupApplication[]>;
  
  // Group Idea Ratings
  getGroupIdeaRatings(groupId: string): Promise<(schema.GroupIdeaRating & { raterName: string | null; ideaTitle: string })[]>;
  getIdeaRatings(ideaId: string, groupId: string): Promise<(schema.GroupIdeaRating & { raterName: string | null })[]>;
  upsertGroupIdeaRating(data: { groupId: string; ideaId: string; ratedBy: number; score: number; feedback?: string }): Promise<schema.GroupIdeaRating>;
  getGroupIdeasWithRatings(groupId: string): Promise<(schema.Idea & { creatorName: string | null; avgScore: number | null; ratingCount: number })[]>;
  
  // Pitch Decks
  getPitchDeck(ideaId: string): Promise<typeof schema.pitchDecks.$inferSelect | undefined>;
  savePitchDeck(data: {
    ideaId: string;
    investorMode: string;
    deckType: string;
    targetRaise?: string;
    slides: string;
    metricsValidation?: string;
  }): Promise<typeof schema.pitchDecks.$inferSelect>;
  updatePitchDeck(ideaId: string, data: Partial<typeof schema.pitchDecks.$inferInsert>): Promise<typeof schema.pitchDecks.$inferSelect | undefined>;
  
  // Pitch Preparations
  getPitchPreparation(ideaId: string): Promise<typeof schema.pitchPreparations.$inferSelect | undefined>;
  savePitchPreparation(data: {
    ideaId: string;
    investorMode: string;
    deliveryScripts: string;
    objections?: string;
    rehearsalQuestions?: string;
  }): Promise<typeof schema.pitchPreparations.$inferSelect>;
  updatePitchPreparation(ideaId: string, data: Partial<typeof schema.pitchPreparations.$inferInsert>): Promise<typeof schema.pitchPreparations.$inferSelect | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(schema.users).values(user).returning();
    return created;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(schema.users)
      .set({ password: hashedPassword })
      .where(eq(schema.users.id, userId));
  }

  async createPasswordResetToken(userId: number): Promise<string> {
    // Generate a cryptographically secure random token
    const crypto = await import('crypto');
    const tokenBytes = crypto.randomBytes(32);
    const token = tokenBytes.toString('hex');
    
    // Hash the token before storing (security best practice)
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    // Store hashed token in database
    await db.insert(schema.passwordResetTokens).values({
      userId,
      token: hashedToken,
      expiresAt,
      used: false,
    });
    
    // Return the unhashed token to send in email
    return token;
  }

  async validateResetToken(token: string): Promise<User | null> {
    const crypto = await import('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find token in database
    const [resetToken] = await db.select()
      .from(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.token, hashedToken));
    
    if (!resetToken) {
      return null;
    }
    
    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return null;
    }
    
    // Check if token has been used
    if (resetToken.used) {
      return null;
    }
    
    // Get user
    const user = await this.getUser(resetToken.userId);
    return user || null;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const crypto = await import('crypto');
    const bcrypt = await import('bcryptjs');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find and validate token
    const [resetToken] = await db.select()
      .from(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.token, hashedToken));
    
    if (!resetToken || new Date() > resetToken.expiresAt || resetToken.used) {
      return false;
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    await this.updateUserPassword(resetToken.userId, hashedPassword);
    
    // Mark token as used
    await db.update(schema.passwordResetTokens)
      .set({ used: true })
      .where(eq(schema.passwordResetTokens.id, resetToken.id));
    
    return true;
  }

  async getProfile(userId: number): Promise<Profile | undefined> {
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
    return profile;
  }

  async updateProfile(userId: number, data: Partial<Profile>): Promise<Profile | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };

    if (updateData.skills !== undefined) {
      updateData.skills = Array.isArray(updateData.skills) ? updateData.skills : [];
    }
    if (updateData.interests !== undefined) {
      updateData.interests = Array.isArray(updateData.interests) ? updateData.interests : [];
    }

    const result = await db
      .update(schema.profiles)
      .set(updateData)
      .where(eq(schema.profiles.userId, userId))
      .returning();
    return result.length > 0 ? result[0] : undefined;
  }

  async createProfile(userId: number, data: Partial<Profile>): Promise<Profile> {
    const [profile] = await db
      .insert(schema.profiles)
      .values({ ...data, userId })
      .returning();
    return profile;
  }

  async findProfilesBySkills(skills: string[], excludeUserId?: number): Promise<ProfileWithMatchingSkills[]> {
    if (!skills || skills.length === 0) {
      return [];
    }

    const normalizedSkills = skills.map(s => s.trim().toLowerCase());
    
    const profiles = await db.select().from(schema.profiles);
    
    const matchedProfiles: ProfileWithMatchingSkills[] = [];
    
    for (const profile of profiles) {
      if (excludeUserId && profile.userId === excludeUserId) {
        continue;
      }
      
      const profileSkills = (profile.skills || []).map(s => s.toLowerCase());
      const matchingSkills = skills.filter(skill => 
        profileSkills.includes(skill.toLowerCase())
      );
      
      if (matchingSkills.length > 0) {
        matchedProfiles.push({
          ...profile,
          matchingSkills,
          matchCount: matchingSkills.length,
        });
      }
    }
    
    matchedProfiles.sort((a, b) => b.matchCount - a.matchCount);
    
    return matchedProfiles.slice(0, 10);
  }

  async findIdeasBySkills(skills: string[], excludeUserId?: number): Promise<IdeaWithMatchingSkills[]> {
    if (!skills || skills.length === 0) {
      return [];
    }

    const normalizedSkills = skills.map(s => s.trim().toLowerCase());
    
    // Get all public ideas
    const ideas = await db.select().from(schema.ideas).where(eq(schema.ideas.isPublic, true));
    
    const matchedIdeas: IdeaWithMatchingSkills[] = [];
    
    for (const idea of ideas) {
      if (excludeUserId && idea.creatorId === excludeUserId) {
        continue;
      }
      
      // Check if idea has skills array or extract from desiredTeammates text
      let ideaSkills: string[] = [];
      
      if (idea.skills && Array.isArray(idea.skills)) {
        ideaSkills = idea.skills.map(s => s.toLowerCase());
      } else if (idea.desiredTeammates) {
        // Extract skills from desiredTeammates text
        ideaSkills = idea.desiredTeammates
          .toLowerCase()
          .split(/[,;\n]+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
      
      const matchingSkills = skills.filter(skill => 
        ideaSkills.some(ideaSkill => 
          ideaSkill.includes(skill.toLowerCase()) || 
          skill.toLowerCase().includes(ideaSkill)
        )
      );
      
      if (matchingSkills.length > 0) {
        matchedIdeas.push({
          idea,
          matchingSkills,
          matchCount: matchingSkills.length,
        });
      }
    }
    
    matchedIdeas.sort((a, b) => b.matchCount - a.matchCount);
    
    return matchedIdeas;
  }

  async getAllUsersForMatching(): Promise<any[]> {
    // Get all users with their profiles and idea counts for matching
    const users = await db.select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.profiles.fullName,
      bio: schema.profiles.bio,
      skills: schema.profiles.skills,
      university_id: schema.profiles.universityId,
      university_name: schema.universities.name,
      idea_count: sql<number>`(
        SELECT COUNT(*) 
        FROM ${schema.ideas} 
        WHERE ${schema.ideas.creatorId} = ${schema.users.id}
      )`,
    })
    .from(schema.users)
    .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
    .leftJoin(schema.universities, eq(schema.profiles.universityId, schema.universities.id));
    
    return users;
  }

  async getProfilesByYassuRole(role: "ambassador" | "advisor"): Promise<Profile[]> {
    // Get profiles that have the specified badge (awarded by superadmin)
    const badges = await db.select().from(schema.profileBadges)
      .where(eq(schema.profileBadges.badgeType, role));
    
    if (badges.length === 0) return [];
    
    const userIds = badges.map(b => b.userId);
    return db.select().from(schema.profiles)
      .where(inArray(schema.profiles.userId, userIds))
      .orderBy(schema.profiles.fullName);
  }

  async getUserRoles(userId: number): Promise<UserRole[]> {
    return db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, userId));
  }

  async addUserRole(userId: number, role: string): Promise<void> {
    await db.insert(schema.userRoles).values({ userId, role: role as any }).onConflictDoNothing();
  }

  async getUniversities(): Promise<University[]> {
    return db.select().from(schema.universities).orderBy(schema.universities.name);
  }

  async getUniversity(id: string): Promise<University | undefined> {
    const [uni] = await db.select().from(schema.universities).where(eq(schema.universities.id, id));
    return uni;
  }

  async getIdeas(userId?: number): Promise<Idea[]> {
    // If userId is provided, include their private ideas
    // Otherwise, only show public ideas (for marketplace)
    if (userId) {
      return db.select().from(schema.ideas)
        .where(
          or(
            eq(schema.ideas.isPublic, true),
            eq(schema.ideas.createdBy, userId)
          )
        )
        .orderBy(desc(schema.ideas.createdAt));
    }
    
    // Marketplace: only show public ideas
    return db.select().from(schema.ideas)
      .where(eq(schema.ideas.isPublic, true))
      .orderBy(desc(schema.ideas.createdAt));
  }

  async getIdeasWithCreators(): Promise<(Idea & { creatorName: string | null; creatorAvatarUrl: string | null })[]> {
    const ideas = await db.select().from(schema.ideas)
      .where(eq(schema.ideas.isPublic, true))
      .orderBy(desc(schema.ideas.createdAt));
    
    // Get creator profiles for all ideas
    const creatorIds = [...new Set(ideas.map(i => i.createdBy).filter(Boolean))];
    const profiles = creatorIds.length > 0 
      ? await db.select().from(schema.profiles).where(inArray(schema.profiles.userId, creatorIds as number[]))
      : [];
    
    const profileMap = new Map(profiles.map(p => [p.userId, p]));
    
    return ideas.map(idea => ({
      ...idea,
      creatorName: idea.createdBy ? profileMap.get(idea.createdBy)?.fullName || null : null,
      creatorAvatarUrl: idea.createdBy ? profileMap.get(idea.createdBy)?.avatarUrl || null : null,
    }));
  }

  async getIdea(id: string): Promise<Idea | undefined> {
    const [idea] = await db.select().from(schema.ideas).where(eq(schema.ideas.id, id));
    return idea;
  }

  async createIdea(data: Partial<Idea>): Promise<Idea> {
    const [idea] = await db.insert(schema.ideas).values(data as any).returning();
    return idea;
  }

  async updateIdea(id: string, data: Partial<Idea>): Promise<Idea | undefined> {
    const [idea] = await db
      .update(schema.ideas)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.ideas.id, id))
      .returning();
    return idea;
  }

  async deleteIdea(id: string): Promise<void> {
    // Get workflow runs for this idea
    const runs = await db.select().from(schema.workflowRuns).where(eq(schema.workflowRuns.ideaId, id));
    
    // Delete workflow artifacts for each run (must be deleted before workflow_runs)
    for (const run of runs) {
      await db.delete(schema.workflowArtifacts).where(eq(schema.workflowArtifacts.workflowRunId, run.id));
    }
    
    // Delete related records (order matters for foreign key constraints)
    await db.delete(schema.ideaWorkflowSections).where(eq(schema.ideaWorkflowSections.ideaId, id));
    await db.delete(schema.ideaIndustries).where(eq(schema.ideaIndustries.ideaId, id));
    await db.delete(schema.ideaTags).where(eq(schema.ideaTags.ideaId, id));
    await db.delete(schema.teamInvites).where(eq(schema.teamInvites.ideaId, id));
    await db.delete(schema.joinRequests).where(eq(schema.joinRequests.ideaId, id));
    await db.delete(schema.workflowRuns).where(eq(schema.workflowRuns.ideaId, id));
    await db.delete(schema.teams).where(eq(schema.teams.ideaId, id));
    
    // Finally delete the idea itself
    await db.delete(schema.ideas).where(eq(schema.ideas.id, id));
  }

  async getIdeaTags(ideaId: string): Promise<{ tag: string }[]> {
    return db.select({ tag: schema.ideaTags.tag }).from(schema.ideaTags).where(eq(schema.ideaTags.ideaId, ideaId));
  }

  async addIdeaTag(ideaId: string, tag: string): Promise<void> {
    await db.insert(schema.ideaTags).values({ ideaId, tag }).onConflictDoNothing();
  }

  async getIndustries(): Promise<schema.Industry[]> {
    return db.select().from(schema.industries).orderBy(schema.industries.name);
  }

  async seedIndustries(): Promise<void> {
    for (const industry of schema.PREDEFINED_INDUSTRIES) {
      await db.insert(schema.industries)
        .values({ name: industry.name, slug: industry.slug })
        .onConflictDoNothing();
    }
  }

  async addIdeaIndustries(ideaId: string, industryIds: number[]): Promise<void> {
    if (industryIds.length === 0) return;
    const values = industryIds.map(industryId => ({ ideaId, industryId }));
    await db.insert(schema.ideaIndustries).values(values).onConflictDoNothing();
  }

  async getIdeaIndustries(ideaId: string): Promise<schema.Industry[]> {
    const rows = await db
      .select({
        id: schema.industries.id,
        name: schema.industries.name,
        slug: schema.industries.slug,
      })
      .from(schema.ideaIndustries)
      .innerJoin(schema.industries, eq(schema.ideaIndustries.industryId, schema.industries.id))
      .where(eq(schema.ideaIndustries.ideaId, ideaId));
    return rows;
  }

  async removeIdeaIndustries(ideaId: string): Promise<void> {
    await db.delete(schema.ideaIndustries).where(eq(schema.ideaIndustries.ideaId, ideaId));
  }

  async getProfileIndustries(profileId: number): Promise<schema.Industry[]> {
    const rows = await db
      .select({
        id: schema.industries.id,
        name: schema.industries.name,
        slug: schema.industries.slug,
      })
      .from(schema.profileIndustries)
      .innerJoin(schema.industries, eq(schema.profileIndustries.industryId, schema.industries.id))
      .where(eq(schema.profileIndustries.profileId, profileId));
    return rows;
  }

  async setProfileIndustries(profileId: number, industryIds: number[]): Promise<void> {
    await db.delete(schema.profileIndustries).where(eq(schema.profileIndustries.profileId, profileId));
    if (industryIds.length === 0) return;
    const values = industryIds.map(industryId => ({ profileId, industryId }));
    await db.insert(schema.profileIndustries).values(values).onConflictDoNothing();
  }

  async getTeams(userId?: number): Promise<Team[]> {
    return db.select().from(schema.teams).orderBy(desc(schema.teams.createdAt));
  }

  async getUserTeams(userId: number): Promise<Team[]> {
    // Get teams where user is the creator
    const createdTeams = await db.select()
      .from(schema.teams)
      .where(eq(schema.teams.createdBy, userId));
    
    // Get teams where user is a member
    const memberTeams = await db.select({
      id: schema.teams.id,
      name: schema.teams.name,
      description: schema.teams.description,
      ideaId: schema.teams.ideaId,
      createdBy: schema.teams.createdBy,
      createdAt: schema.teams.createdAt,
      updatedAt: schema.teams.updatedAt,
    })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .where(eq(schema.teamMembers.userId, userId));
    
    // Combine and deduplicate
    const allTeams = [...createdTeams, ...memberTeams];
    const uniqueTeams = allTeams.filter((team, index, self) => 
      index === self.findIndex(t => t.id === team.id)
    );
    
    return uniqueTeams.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(schema.teams).where(eq(schema.teams.id, id));
    return team;
  }

  async createTeam(data: Partial<Team>): Promise<Team> {
    const [team] = await db.insert(schema.teams).values(data as any).returning();
    return team;
  }

  async getProjects(userId?: number): Promise<Project[]> {
    return db.select().from(schema.projects).orderBy(desc(schema.projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
    return project;
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const [project] = await db.insert(schema.projects).values(data as any).returning();
    return project;
  }

  async getWorkflowRuns(userId: number): Promise<WorkflowRun[]> {
    return db.select().from(schema.workflowRuns)
      .where(eq(schema.workflowRuns.userId, userId))
      .orderBy(desc(schema.workflowRuns.createdAt));
  }

  async getWorkflowRun(id: string): Promise<WorkflowRun | undefined> {
    const [run] = await db.select().from(schema.workflowRuns).where(eq(schema.workflowRuns.id, id));
    return run;
  }

  async createWorkflowRun(data: Partial<WorkflowRun>): Promise<WorkflowRun> {
    const [run] = await db.insert(schema.workflowRuns).values(data as any).returning();
    return run;
  }

  async updateWorkflowRun(id: string, data: Partial<WorkflowRun>): Promise<void> {
    await db.update(schema.workflowRuns).set(data).where(eq(schema.workflowRuns.id, id));
  }

  async getWorkflowArtifacts(runId: string): Promise<WorkflowArtifact[]> {
    return db.select().from(schema.workflowArtifacts)
      .where(eq(schema.workflowArtifacts.workflowRunId, runId))
      .orderBy(desc(schema.workflowArtifacts.createdAt));
  }

  async createWorkflowArtifact(data: Partial<WorkflowArtifact>): Promise<WorkflowArtifact> {
    const [artifact] = await db.insert(schema.workflowArtifacts).values(data as any).returning();
    return artifact;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(schema.notifications).set({ read: true }).where(eq(schema.notifications.id, id));
  }

  async createNotification(data: { userId: number; type: string; title: string; message?: string; link?: string }): Promise<Notification> {
    const [notification] = await db.insert(schema.notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message || null,
      link: data.link || null,
    }).returning();
    return notification;
  }

  async getUniversityResources(universityId: string): Promise<any[]> {
    return db.select().from(schema.universityResources)
      .where(eq(schema.universityResources.universityId, universityId));
  }

  async getUserIdeas(userId: number): Promise<Idea[]> {
    return db.select().from(schema.ideas)
      .where(eq(schema.ideas.createdBy, userId))
      .orderBy(desc(schema.ideas.createdAt));
  }

  async getJoinRequestsForUserIdeas(userId: number): Promise<(JoinRequest & { requester: Profile; idea: Idea })[]> {
    const userIdeas = await this.getUserIdeas(userId);
    const ideaIds = userIdeas.map(i => i.id);
    
    if (ideaIds.length === 0) return [];
    
    const requests = await db.select()
      .from(schema.joinRequests)
      .where(and(
        inArray(schema.joinRequests.ideaId, ideaIds),
        eq(schema.joinRequests.status, "pending")
      ))
      .orderBy(desc(schema.joinRequests.createdAt));
    
    const results: (JoinRequest & { requester: Profile; idea: Idea })[] = [];
    
    for (const request of requests) {
      const [requester] = await db.select().from(schema.profiles)
        .where(eq(schema.profiles.userId, request.userId));
      const idea = userIdeas.find(i => i.id === request.ideaId);
      
      if (requester && idea) {
        results.push({ ...request, requester, idea });
      }
    }
    
    return results;
  }

  async createJoinRequest(data: Partial<JoinRequest>): Promise<JoinRequest> {
    const [request] = await db.insert(schema.joinRequests).values(data as any).returning();
    return request;
  }

  async updateJoinRequest(id: string, data: Partial<JoinRequest>): Promise<JoinRequest | undefined> {
    const [updated] = await db.update(schema.joinRequests)
      .set(data)
      .where(eq(schema.joinRequests.id, id))
      .returning();
    return updated;
  }

  async getTeamInvitesFromUser(userId: number): Promise<TeamInvite[]> {
    return db.select().from(schema.teamInvites)
      .where(eq(schema.teamInvites.inviterId, userId))
      .orderBy(desc(schema.teamInvites.createdAt));
  }

  async createTeamInvite(data: Partial<TeamInvite>): Promise<TeamInvite> {
    const [invite] = await db.insert(schema.teamInvites).values(data as any).returning();
    return invite;
  }

  async getPotentialTeamMembers(excludeUserId: number, ideaId?: string): Promise<Profile[]> {
    // Get all active profiles (excluding the current user)
    const allProfiles = await db.select().from(schema.profiles)
      .where(sql`${schema.profiles.userId} != ${excludeUserId}`);
    
    if (!ideaId) {
      // If no ideaId provided, return all profiles (for general browsing)
      return allProfiles.slice(0, 10);
    }
    
    // Get the idea details including tags
    const [idea] = await db.select().from(schema.ideas)
      .where(eq(schema.ideas.id, ideaId));
    
    if (!idea) return [];
    
    // Get idea tags
    const ideaTags = await db.select().from(schema.ideaTags)
      .where(eq(schema.ideaTags.ideaId, ideaId));
    const tags = ideaTags.map(t => t.tag.toLowerCase());
    
    // Filter out already invited users and team members for this idea
    const existingInvites = await db.select().from(schema.teamInvites)
      .where(eq(schema.teamInvites.ideaId, ideaId));
    
    const existingRequests = await db.select().from(schema.joinRequests)
      .where(eq(schema.joinRequests.ideaId, ideaId));
    
    const teamMembers = await db.select().from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teams.id, schema.teamMembers.teamId))
      .where(eq(schema.teams.ideaId, ideaId));
    
    const excludeUserIds = new Set([
      ...existingInvites.map(i => i.inviteeId),
      ...existingRequests.map(r => r.userId),
      ...teamMembers.map(tm => tm.team_members.userId),
      idea.createdBy // Exclude idea creator
    ]);
    
    // Calculate relevance score for each profile
    const scoredProfiles = allProfiles
      .filter(p => !excludeUserIds.has(p.userId))
      .map(profile => {
        let score = 0;
        
        // Skills matching (highest weight)
        if (profile.skills && profile.skills.length > 0) {
          const profileSkills = profile.skills.map(s => s.toLowerCase());
          const skillMatches = tags.filter(tag => 
            profileSkills.some(skill => skill.includes(tag) || tag.includes(skill))
          ).length;
          score += skillMatches * 10; // 10 points per skill match
        }
        
        // Interests matching (medium weight)
        if (profile.interests && profile.interests.length > 0) {
          const profileInterests = profile.interests.map(i => i.toLowerCase());
          const interestMatches = tags.filter(tag => 
            profileInterests.some(interest => interest.includes(tag) || tag.includes(interest))
          ).length;
          score += interestMatches * 5; // 5 points per interest match
        }
        
        // Problem/solution keyword matching (low weight)
        const ideaText = `${idea.title} ${idea.problem} ${idea.solution || ''}`.toLowerCase();
        if (profile.skills) {
          profile.skills.forEach(skill => {
            if (ideaText.includes(skill.toLowerCase())) {
              score += 3; // 3 points per keyword match
            }
          });
        }
        
        // Availability bonus (prefer available people)
        if (profile.availability && profile.availability !== 'Not Available') {
          score += 2;
        }
        
        // Same university bonus (prefer same school)
        if (profile.universityId && profile.universityId === idea.universityId) {
          score += 5;
        }
        
        return { profile, score };
      })
      .filter(item => item.score > 0) // Only include profiles with some relevance
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 10) // Top 10 matches
      .map(item => item.profile);
    
    // If no matches found, return some random active profiles as fallback
    if (scoredProfiles.length === 0) {
      return allProfiles
        .filter(p => !excludeUserIds.has(p.userId))
        .slice(0, 5);
    }
    
    return scoredProfiles;
  }

  async getIdeaWorkflowSections(ideaId: string): Promise<IdeaWorkflowSection[]> {
    return db.select().from(schema.ideaWorkflowSections)
      .where(eq(schema.ideaWorkflowSections.ideaId, ideaId))
      .orderBy(schema.ideaWorkflowSections.sectionType);
  }

  async getIdeaWorkflowSection(ideaId: string, sectionType: string): Promise<IdeaWorkflowSection | undefined> {
    const [section] = await db.select().from(schema.ideaWorkflowSections)
      .where(and(
        eq(schema.ideaWorkflowSections.ideaId, ideaId),
        eq(schema.ideaWorkflowSections.sectionType, sectionType)
      ));
    return section;
  }

  async upsertIdeaWorkflowSection(ideaId: string, sectionType: string, content: string, aiGenerated: boolean = false): Promise<IdeaWorkflowSection> {
    const existing = await this.getIdeaWorkflowSection(ideaId, sectionType);
    
    if (existing) {
      const [updated] = await db.update(schema.ideaWorkflowSections)
        .set({ content, aiGenerated, updatedAt: new Date() })
        .where(eq(schema.ideaWorkflowSections.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(schema.ideaWorkflowSections)
        .values({ ideaId, sectionType, content, aiGenerated })
        .returning();
      return created;
    }
  }

  async getUserBadges(userId: number): Promise<ProfileBadge[]> {
    return db.select().from(schema.profileBadges)
      .where(eq(schema.profileBadges.userId, userId))
      .orderBy(schema.profileBadges.awardedAt);
  }

  async awardBadge(userId: number, badgeType: "ambassador" | "advisor", awardedBy: number): Promise<ProfileBadge> {
    // Check if badge already exists
    const [existing] = await db.select().from(schema.profileBadges)
      .where(and(
        eq(schema.profileBadges.userId, userId),
        eq(schema.profileBadges.badgeType, badgeType)
      ));
    
    if (existing) {
      return existing;
    }
    
    const [badge] = await db.insert(schema.profileBadges)
      .values({ userId, badgeType, awardedBy })
      .returning();
    return badge;
  }

  async revokeBadge(userId: number, badgeType: "ambassador" | "advisor"): Promise<void> {
    await db.delete(schema.profileBadges)
      .where(and(
        eq(schema.profileBadges.userId, userId),
        eq(schema.profileBadges.badgeType, badgeType)
      ));
  }

  async getAllProfiles(): Promise<Profile[]> {
    return db.select().from(schema.profiles)
      .orderBy(schema.profiles.fullName);
  }

  async getProfilesWithBadges(): Promise<(Profile & { badges: ProfileBadge[] })[]> {
    const profiles = await db.select().from(schema.profiles)
      .orderBy(schema.profiles.fullName);
    
    const badges = await db.select().from(schema.profileBadges);
    
    return profiles.map(profile => ({
      ...profile,
      badges: badges.filter(b => b.userId === profile.userId)
    }));
  }

  async isSuperadmin(userId: number): Promise<boolean> {
    const roles = await db.select().from(schema.userRoles)
      .where(and(
        eq(schema.userRoles.userId, userId),
        eq(schema.userRoles.role, 'admin')
      ));
    return roles.length > 0;
  }

  async getAllIdeasAdmin(): Promise<Idea[]> {
    return db.select().from(schema.ideas)
      .orderBy(desc(schema.ideas.createdAt));
  }

  async getAdmins(): Promise<{ userId: number; email: string; fullName: string | null }[]> {
    const adminRoles = await db.select().from(schema.userRoles)
      .where(eq(schema.userRoles.role, 'admin'));
    
    if (adminRoles.length === 0) return [];
    
    const adminUserIds = adminRoles.map(r => r.userId);
    const users = await db.select({
      userId: schema.users.id,
      email: schema.users.email,
      fullName: schema.users.fullName
    }).from(schema.users)
      .where(inArray(schema.users.id, adminUserIds));
    
    return users;
  }

  async grantAdminRole(userId: number): Promise<void> {
    // Check if already admin
    const existing = await db.select().from(schema.userRoles)
      .where(and(
        eq(schema.userRoles.userId, userId),
        eq(schema.userRoles.role, 'admin')
      ));
    
    if (existing.length > 0) return;
    
    await db.insert(schema.userRoles).values({ userId, role: 'admin' });
  }

  async revokeAdminRole(userId: number): Promise<void> {
    await db.delete(schema.userRoles)
      .where(and(
        eq(schema.userRoles.userId, userId),
        eq(schema.userRoles.role, 'admin')
      ));
  }

  // Connection system implementation
  async sendConnectionRequest(requesterId: number, recipientId: number, message?: string): Promise<Connection> {
    // Generate secure random token for email CTA
    const acceptToken = crypto.randomBytes(32).toString('hex');
    
    // Check if connection already exists (in either direction)
    const existing = await db.select().from(schema.connections)
      .where(or(
        and(
          eq(schema.connections.requesterId, requesterId),
          eq(schema.connections.recipientId, recipientId)
        ),
        and(
          eq(schema.connections.requesterId, recipientId),
          eq(schema.connections.recipientId, requesterId)
        )
      ));
    
    if (existing.length > 0) {
      const conn = existing[0];
      // If already accepted or pending, don't allow new request
      if (conn.status === 'accepted' || conn.status === 'pending') {
        throw new Error('Connection already exists');
      }
      // If rejected, update in-place to allow reconnection (reset to pending with new requester)
      if (conn.status === 'rejected') {
        const [updated] = await db.update(schema.connections)
          .set({ 
            requesterId, 
            recipientId, 
            status: 'pending', 
            message, 
            acceptToken,
            createdAt: new Date(),
            respondedAt: null 
          })
          .where(eq(schema.connections.id, conn.id))
          .returning();
        return updated;
      }
    }
    
    try {
      const [connection] = await db.insert(schema.connections)
        .values({ requesterId, recipientId, message, status: 'pending', acceptToken })
        .returning();
      return connection;
    } catch (error: any) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        throw new Error('Connection already exists');
      }
      throw error;
    }
  }

  async getConnectionStatus(userId1: number, userId2: number): Promise<{ status: string; connection?: Connection } | null> {
    const [connection] = await db.select().from(schema.connections)
      .where(or(
        and(
          eq(schema.connections.requesterId, userId1),
          eq(schema.connections.recipientId, userId2)
        ),
        and(
          eq(schema.connections.requesterId, userId2),
          eq(schema.connections.recipientId, userId1)
        )
      ));
    
    if (!connection) return null;
    
    return { status: connection.status, connection };
  }

  async getPendingConnectionRequests(userId: number, direction: 'received' | 'sent'): Promise<(Connection & { profile: Profile })[]> {
    const connections = await db.select().from(schema.connections)
      .where(and(
        direction === 'received'
          ? eq(schema.connections.recipientId, userId)
          : eq(schema.connections.requesterId, userId),
        eq(schema.connections.status, 'pending')
      ))
      .orderBy(desc(schema.connections.createdAt));
    
    const results: (Connection & { profile: Profile })[] = [];
    
    for (const conn of connections) {
      const otherUserId = direction === 'received' ? conn.requesterId : conn.recipientId;
      const [profile] = await db.select().from(schema.profiles)
        .where(eq(schema.profiles.userId, otherUserId));
      
      if (profile) {
        results.push({ ...conn, profile });
      }
    }
    
    return results;
  }

  async getConnections(userId: number): Promise<(Connection & { profile: Profile })[]> {
    const connections = await db.select().from(schema.connections)
      .where(and(
        or(
          eq(schema.connections.requesterId, userId),
          eq(schema.connections.recipientId, userId)
        ),
        eq(schema.connections.status, 'accepted')
      ))
      .orderBy(desc(schema.connections.respondedAt));
    
    const results: (Connection & { profile: Profile })[] = [];
    
    for (const conn of connections) {
      const otherUserId = conn.requesterId === userId ? conn.recipientId : conn.requesterId;
      const [profile] = await db.select().from(schema.profiles)
        .where(eq(schema.profiles.userId, otherUserId));
      
      if (profile) {
        results.push({ ...conn, profile });
      }
    }
    
    return results;
  }

  async acceptConnection(connectionId: string, userId: number): Promise<Connection | undefined> {
    // Only the recipient can accept
    const [connection] = await db.select().from(schema.connections)
      .where(and(
        eq(schema.connections.id, connectionId),
        eq(schema.connections.recipientId, userId),
        eq(schema.connections.status, 'pending')
      ));
    
    if (!connection) return undefined;
    
    const [updated] = await db.update(schema.connections)
      .set({ status: 'accepted', respondedAt: new Date(), acceptToken: null })
      .where(eq(schema.connections.id, connectionId))
      .returning();
    return updated;
  }

  async acceptConnectionByToken(requestId: string, token: string): Promise<Connection | undefined> {
    // Validate token and accept connection
    const [connection] = await db.select().from(schema.connections)
      .where(and(
        eq(schema.connections.id, requestId),
        eq(schema.connections.acceptToken, token),
        eq(schema.connections.status, 'pending')
      ));
    
    if (!connection) return undefined;
    
    const [updated] = await db.update(schema.connections)
      .set({ status: 'accepted', respondedAt: new Date(), acceptToken: null })
      .where(eq(schema.connections.id, requestId))
      .returning();
    return updated;
  }

  async getConnectionByToken(requestId: string, token: string): Promise<Connection | undefined> {
    const [connection] = await db.select().from(schema.connections)
      .where(and(
        eq(schema.connections.id, requestId),
        eq(schema.connections.acceptToken, token),
        eq(schema.connections.status, 'pending')
      ));
    return connection;
  }

  async rejectConnectionByToken(requestId: string, token: string): Promise<Connection | undefined> {
    const [connection] = await db.select().from(schema.connections)
      .where(and(
        eq(schema.connections.id, requestId),
        eq(schema.connections.acceptToken, token),
        eq(schema.connections.status, 'pending')
      ));
    
    if (!connection) return undefined;
    
    const [updated] = await db.update(schema.connections)
      .set({ status: 'rejected', respondedAt: new Date(), acceptToken: null })
      .where(eq(schema.connections.id, requestId))
      .returning();
    return updated;
  }

  async rejectConnection(connectionId: string, userId: number): Promise<Connection | undefined> {
    // Only the recipient can reject
    const [connection] = await db.select().from(schema.connections)
      .where(and(
        eq(schema.connections.id, connectionId),
        eq(schema.connections.recipientId, userId),
        eq(schema.connections.status, 'pending')
      ));
    
    if (!connection) return undefined;
    
    const [updated] = await db.update(schema.connections)
      .set({ status: 'rejected', respondedAt: new Date() })
      .where(eq(schema.connections.id, connectionId))
      .returning();
    return updated;
  }

  async cancelConnection(connectionId: string, userId: number): Promise<void> {
    // Only the requester can cancel a pending request
    await db.delete(schema.connections)
      .where(and(
        eq(schema.connections.id, connectionId),
        eq(schema.connections.requesterId, userId),
        eq(schema.connections.status, 'pending')
      ));
  }

  async removeConnection(connectionId: string, userId: number): Promise<void> {
    // Either party can remove an accepted connection
    await db.delete(schema.connections)
      .where(and(
        eq(schema.connections.id, connectionId),
        or(
          eq(schema.connections.requesterId, userId),
          eq(schema.connections.recipientId, userId)
        ),
        eq(schema.connections.status, 'accepted')
      ));
  }

  async getCollaborators(filters: {
    roles?: string[];
    skills?: string[];
    interests?: string[];
    clubType?: string;
    search?: string;
  }): Promise<(Profile & { 
    roles: string[]; 
    university?: { name: string; shortName: string | null } | null;
  })[]> {
    // Get all profiles with their universities
    const profiles = await db.select({
      profile: schema.profiles,
      university: schema.universities,
    })
    .from(schema.profiles)
    .leftJoin(schema.universities, eq(schema.profiles.universityId, schema.universities.id));
    
    // Get all ideas to identify creators
    const ideas = await db.select({ createdBy: schema.ideas.createdBy })
      .from(schema.ideas);
    const creatorIds = new Set(ideas.map(i => i.createdBy));
    
    // Get all profile badges (ambassadors/advisors)
    const badges = await db.select().from(schema.profileBadges);
    const badgesByUser = new Map<number, string[]>();
    badges.forEach(b => {
      const existing = badgesByUser.get(b.userId) || [];
      existing.push(b.badgeType);
      badgesByUser.set(b.userId, existing);
    });
    
    // Build enriched profiles with roles
    const enrichedProfiles = profiles.map(({ profile, university }) => {
      const roles: string[] = [];
      if (creatorIds.has(profile.userId)) roles.push('creator');
      const userBadges = badgesByUser.get(profile.userId) || [];
      if (userBadges.includes('ambassador')) roles.push('ambassador');
      if (userBadges.includes('advisor')) roles.push('advisor');
      
      return {
        ...profile,
        roles,
        university: university ? { name: university.name, shortName: university.shortName } : null,
      };
    });
    
    // Apply filters
    let result = enrichedProfiles;
    
    // Filter by roles
    if (filters.roles && filters.roles.length > 0) {
      result = result.filter(p => 
        filters.roles!.some(role => p.roles.includes(role))
      );
    }
    
    // Filter by skills (any match)
    if (filters.skills && filters.skills.length > 0) {
      result = result.filter(p => 
        p.skills && filters.skills!.some(skill => p.skills!.includes(skill))
      );
    }
    
    // Filter by interests (any match)
    if (filters.interests && filters.interests.length > 0) {
      result = result.filter(p => 
        p.interests && filters.interests!.some(interest => p.interests!.includes(interest))
      );
    }
    
    // Filter by clubType
    if (filters.clubType) {
      result = result.filter(p => p.clubType === filters.clubType);
    }
    
    // Filter by search (name or university)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(p => 
        (p.fullName && p.fullName.toLowerCase().includes(searchLower)) ||
        (p.university?.name && p.university.name.toLowerCase().includes(searchLower))
      );
    }
    
    return result;
  }
  
  async getPublicProfile(userId: number): Promise<{
    profile: Profile;
    university: { name: string; shortName: string | null } | null;
    roles: string[];
    badges: ProfileBadge[];
    ideas: Idea[];
  } | null> {
    // Get profile with university
    const [result] = await db.select({
      profile: schema.profiles,
      university: schema.universities,
    })
    .from(schema.profiles)
    .leftJoin(schema.universities, eq(schema.profiles.universityId, schema.universities.id))
    .where(eq(schema.profiles.userId, userId));
    
    if (!result) return null;
    
    // Get badges
    const badges = await db.select()
      .from(schema.profileBadges)
      .where(eq(schema.profileBadges.userId, userId));
    
    // Get public ideas created by this user
    const ideas = await db.select()
      .from(schema.ideas)
      .where(and(
        eq(schema.ideas.createdBy, userId),
        eq(schema.ideas.isPublic, true)
      ));
    
    // Determine roles
    const roles: string[] = [];
    if (ideas.length > 0 || (await db.select().from(schema.ideas).where(eq(schema.ideas.createdBy, userId))).length > 0) {
      roles.push('creator');
    }
    if (badges.some(b => b.badgeType === 'ambassador')) roles.push('ambassador');
    if (badges.some(b => b.badgeType === 'advisor')) roles.push('advisor');
    
    return {
      profile: result.profile,
      university: result.university ? { name: result.university.name, shortName: result.university.shortName } : null,
      roles,
      badges,
      ideas,
    };
  }

  // Admin methods
  async getAllUsers(): Promise<(User & { profile?: Profile; roles: string[] })[]> {
    const users = await db.select().from(schema.users);
    
    const usersWithData = await Promise.all(users.map(async (user) => {
      const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, user.id));
      const roles = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, user.id));
      
      return {
        ...user,
        profile,
        roles: roles.map(r => r.role)
      };
    }));
    
    return usersWithData;
  }

  async getAllIdeas(): Promise<Idea[]> {
    return await db.select().from(schema.ideas).orderBy(desc(schema.ideas.createdAt));
  }

  async getAllTeamMembers(): Promise<any[]> {
    const members = await db.select({
      member: schema.teamMembers,
      user: schema.users,
      profile: schema.profiles,
      team: schema.teams,
    })
    .from(schema.teamMembers)
    .leftJoin(schema.users, eq(schema.teamMembers.userId, schema.users.id))
    .leftJoin(schema.profiles, eq(schema.teamMembers.userId, schema.profiles.userId))
    .leftJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id));
    
    return members;
  }

  async deleteUser(userId: number): Promise<void> {
    // Delete all related data first
    await db.delete(schema.profileBadges).where(eq(schema.profileBadges.userId, userId));
    await db.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
    await db.delete(schema.profiles).where(eq(schema.profiles.userId, userId));
    
    // Delete user's ideas and related data
    const userIdeas = await db.select().from(schema.ideas).where(eq(schema.ideas.createdBy, userId));
    for (const idea of userIdeas) {
      await this.deleteIdea(idea.id);
    }
    
    // Delete team memberships
    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.userId, userId));
    
    // Delete join requests
    await db.delete(schema.joinRequests).where(eq(schema.joinRequests.userId, userId));
    
    // Delete connections
    await db.delete(schema.connections).where(
      or(
        eq(schema.connections.requesterId, userId),
        eq(schema.connections.recipientId, userId)
      )
    );
    
    // Finally delete the user
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  }

  async deleteTeamMember(memberId: string): Promise<void> {
    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, memberId));
  }

  // Weekly digest methods implementation
  async getNewIdeasForWeek(startDate: Date, endDate: Date): Promise<Idea[]> {
    const ideas = await db
      .select()
      .from(schema.ideas)
      .where(
        and(
          sql`${schema.ideas.createdAt} >= ${startDate}`,
          sql`${schema.ideas.createdAt} <= ${endDate}`,
          eq(schema.ideas.isPublic, true)
        )
      )
      .orderBy(desc(schema.ideas.createdAt))
      .limit(50);
    return ideas;
  }

  async getUserActivitySummary(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{ ideasCreated: number; invitesReceived: number; teamsJoined: number }> {
    // Count ideas created by user in date range
    const ideasCreated = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.ideas)
      .where(
        and(
          eq(schema.ideas.creatorId, userId),
          sql`${schema.ideas.createdAt} >= ${startDate}`,
          sql`${schema.ideas.createdAt} <= ${endDate}`
        )
      );

    // Count team invites received in date range
    const invitesReceived = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.teamInvites)
      .where(
        and(
          eq(schema.teamInvites.inviteeId, userId),
          sql`${schema.teamInvites.createdAt} >= ${startDate}`,
          sql`${schema.teamInvites.createdAt} <= ${endDate}`
        )
      );

    // Count teams joined in date range
    const teamsJoined = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.userId, userId),
          sql`${schema.teamMembers.joinedAt} >= ${startDate}`,
          sql`${schema.teamMembers.joinedAt} <= ${endDate}`
        )
      );

    return {
      ideasCreated: Number(ideasCreated[0]?.count || 0),
      invitesReceived: Number(invitesReceived[0]?.count || 0),
      teamsJoined: Number(teamsJoined[0]?.count || 0),
    };
  }

  async getPlatformStats(): Promise<{
    totalIdeas: number;
    totalUsers: number;
    newUsersThisWeek: number;
  }> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const totalIdeas = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.ideas);

    const totalUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users);

    const newUsersThisWeek = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(sql`${schema.users.createdAt} >= ${weekAgo}`);

    return {
      totalIdeas: Number(totalIdeas[0]?.count || 0),
      totalUsers: Number(totalUsers[0]?.count || 0),
      newUsersThisWeek: Number(newUsersThisWeek[0]?.count || 0),
    };
  }

  async getSkillMatchesForUser(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ idea: Idea; matchingSkills: string[] }>> {
    // Get user's skills
    const userProfile = await this.getProfile(userId);
    if (!userProfile || !userProfile.skills || userProfile.skills.length === 0) {
      return [];
    }

    const userSkills = userProfile.skills;

    // Get new ideas from this week
    const newIdeas = await this.getNewIdeasForWeek(startDate, endDate);

    // Calculate skill matches
    const matches: Array<{ idea: Idea; matchingSkills: string[] }> = [];

    for (const idea of newIdeas) {
      if (idea.creatorId === userId) continue; // Skip user's own ideas
      if (!idea.skills || idea.skills.length === 0) continue;

      const matchingSkills = userSkills.filter(skill =>
        idea.skills?.includes(skill)
      );

      if (matchingSkills.length > 0) {
        matches.push({ idea, matchingSkills });
      }
    }

    // Sort by number of matching skills (descending)
    matches.sort((a, b) => b.matchingSkills.length - a.matchingSkills.length);

    // Return top 5 matches
    return matches.slice(0, 5);
  }

  async logDigestEmailSent(
    userId: number,
    weekStart: Date,
    weekEnd: Date,
    ideasCount: number,
    matchesCount: number
  ): Promise<void> {
    await db.insert(schema.digestEmailLog).values({
      userId,
      weekStart,
      weekEnd,
      ideasCount,
      matchesCount,
    });
  }

  async getUsersForDigest(): Promise<(User & { profile: Profile | null })[]> {
    // Get all users
    const users = await db.select().from(schema.users);

    // Get profiles for all users
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        const profile = await this.getProfile(user.id);
        return { ...user, profile };
      })
    );

    // Filter out users without email
    return usersWithProfiles.filter(u => u.email);
  }



  async getUserPortfolio(userId: number): Promise<{
    createdIdeas: (Idea & { teamSize: number })[];
    collaboratingIdeas: (Idea & { role: string | null; joinedAt: Date | null; teamSize: number })[];
  }> {
    // Get ideas created by user
    const createdIdeas = await db
      .select()
      .from(schema.ideas)
      .where(eq(schema.ideas.createdBy, userId))
      .orderBy(desc(schema.ideas.createdAt));

    // Get team sizes for created ideas
    const createdIdeasWithTeamSize = await Promise.all(
      createdIdeas.map(async (idea) => {
        // First get the team for this idea
        const teams = await db
          .select()
          .from(schema.teams)
          .where(eq(schema.teams.ideaId, idea.id));
        
        if (teams.length === 0) {
          return {
            ...idea,
            teamSize: 1, // Just the creator
          };
        }
        
        // Then get team members for this team
        const teamMembers = await db
          .select()
          .from(schema.teamMembers)
          .where(eq(schema.teamMembers.teamId, teams[0].id));
        
        return {
          ...idea,
          teamSize: teamMembers.length + 1, // +1 for creator
        };
      })
    );

    // Get ideas where user is a team member
    const teamMemberships = await db
      .select({
        idea: schema.ideas,
        role: schema.teamMembers.role,
        joinedAt: schema.teamMembers.joinedAt,
        teamId: schema.teamMembers.teamId,
      })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
      .innerJoin(schema.ideas, eq(schema.teams.ideaId, schema.ideas.id))
      .where(eq(schema.teamMembers.userId, userId))
      .orderBy(desc(schema.teamMembers.joinedAt));

    // Get team sizes for collaborating ideas
    const collaboratingIdeasWithTeamSize = await Promise.all(
      teamMemberships.map(async (membership) => {
        const teamMembers = await db
          .select()
          .from(schema.teamMembers)
          .where(eq(schema.teamMembers.teamId, membership.teamId));
        return {
          ...membership.idea,
          role: membership.role,
          joinedAt: membership.joinedAt,
          teamSize: teamMembers.length + 1, // +1 for creator
        };
      })
    );

    return {
      createdIdeas: createdIdeasWithTeamSize,
      collaboratingIdeas: collaboratingIdeasWithTeamSize,
    };
  }

  async getPitchDeck(ideaId: string): Promise<typeof schema.pitchDecks.$inferSelect | undefined> {
    const [deck] = await db
      .select()
      .from(schema.pitchDecks)
      .where(eq(schema.pitchDecks.ideaId, ideaId))
      .orderBy(desc(schema.pitchDecks.updatedAt))
      .limit(1);
    return deck;
  }

  async savePitchDeck(data: {
    ideaId: string;
    investorMode: string;
    deckType: string;
    targetRaise?: string;
    slides: string;
    metricsValidation?: string;
  }): Promise<typeof schema.pitchDecks.$inferSelect> {
    // Check if a deck exists for this idea
    const existing = await this.getPitchDeck(data.ideaId);
    
    if (existing) {
      // Update existing deck with new version
      const [updated] = await db
        .update(schema.pitchDecks)
        .set({
          ...data,
          version: (existing.version || 1) + 1,
          updatedAt: new Date(),
        })
        .where(eq(schema.pitchDecks.id, existing.id))
        .returning();
      return updated;
    }
    
    // Create new deck
    const [deck] = await db
      .insert(schema.pitchDecks)
      .values(data)
      .returning();
    return deck;
  }

  async updatePitchDeck(ideaId: string, data: Partial<typeof schema.pitchDecks.$inferInsert>): Promise<typeof schema.pitchDecks.$inferSelect | undefined> {
    const existing = await this.getPitchDeck(ideaId);
    if (!existing) return undefined;
    
    const [updated] = await db
      .update(schema.pitchDecks)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.pitchDecks.id, existing.id))
      .returning();
    return updated;
  }

  async getPitchPreparation(ideaId: string): Promise<typeof schema.pitchPreparations.$inferSelect | undefined> {
    const [prep] = await db
      .select()
      .from(schema.pitchPreparations)
      .where(eq(schema.pitchPreparations.ideaId, ideaId))
      .orderBy(desc(schema.pitchPreparations.updatedAt))
      .limit(1);
    return prep;
  }

  async savePitchPreparation(data: {
    ideaId: string;
    investorMode: string;
    deliveryScripts: string;
    objections?: string;
    rehearsalQuestions?: string;
  }): Promise<typeof schema.pitchPreparations.$inferSelect> {
    const existing = await this.getPitchPreparation(data.ideaId);
    
    if (existing) {
      const [updated] = await db
        .update(schema.pitchPreparations)
        .set({
          ...data,
          version: (existing.version || 1) + 1,
          updatedAt: new Date(),
        })
        .where(eq(schema.pitchPreparations.id, existing.id))
        .returning();
      return updated;
    }
    
    const [prep] = await db
      .insert(schema.pitchPreparations)
      .values(data)
      .returning();
    return prep;
  }

  async updatePitchPreparation(ideaId: string, data: Partial<typeof schema.pitchPreparations.$inferInsert>): Promise<typeof schema.pitchPreparations.$inferSelect | undefined> {
    const existing = await this.getPitchPreparation(ideaId);
    if (!existing) return undefined;
    
    const [updated] = await db
      .update(schema.pitchPreparations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.pitchPreparations.id, existing.id))
      .returning();
    return updated;
  }

  async getGroups(): Promise<schema.Group[]> {
    return db.select().from(schema.groups).orderBy(desc(schema.groups.createdAt));
  }

  async getGroup(id: string): Promise<schema.Group | undefined> {
    const [group] = await db.select().from(schema.groups).where(eq(schema.groups.id, id));
    return group;
  }

  async getGroupBySlug(slug: string): Promise<schema.Group | undefined> {
    const [group] = await db.select().from(schema.groups).where(eq(schema.groups.slug, slug));
    return group;
  }

  async createGroup(data: schema.InsertGroup): Promise<schema.Group> {
    const [group] = await db.insert(schema.groups).values(data).returning();
    return group;
  }

  async updateGroup(id: string, data: Partial<schema.Group>): Promise<schema.Group | undefined> {
    const [updated] = await db.update(schema.groups).set(data).where(eq(schema.groups.id, id)).returning();
    return updated;
  }

  async deleteGroup(id: string): Promise<void> {
    await db.delete(schema.groups).where(eq(schema.groups.id, id));
  }

  async getGroupMembers(groupId: string): Promise<(schema.GroupMember & { user: User; profile: Profile | null })[]> {
    const members = await db
      .select({
        id: schema.groupMembers.id,
        groupId: schema.groupMembers.groupId,
        userId: schema.groupMembers.userId,
        role: schema.groupMembers.role,
        joinedAt: schema.groupMembers.joinedAt,
        user: schema.users,
        profile: schema.profiles,
      })
      .from(schema.groupMembers)
      .innerJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
      .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
      .where(eq(schema.groupMembers.groupId, groupId))
      .orderBy(schema.groupMembers.joinedAt);
    
    return members.map(m => ({
      id: m.id,
      groupId: m.groupId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
      profile: m.profile,
    }));
  }

  async addGroupMember(groupId: string, userId: number, role: "owner" | "admin" | "member" | "judge"): Promise<schema.GroupMember> {
    const existing = await db
      .select()
      .from(schema.groupMembers)
      .where(and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId)));
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(schema.groupMembers)
        .set({ role })
        .where(eq(schema.groupMembers.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [member] = await db.insert(schema.groupMembers).values({ groupId, userId, role }).returning();
    return member;
  }

  async updateGroupMemberRole(groupId: string, userId: number, role: "owner" | "admin" | "member" | "judge"): Promise<schema.GroupMember | undefined> {
    const [updated] = await db
      .update(schema.groupMembers)
      .set({ role })
      .where(and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId)))
      .returning();
    return updated;
  }

  async removeGroupMember(groupId: string, userId: number): Promise<void> {
    await db
      .delete(schema.groupMembers)
      .where(and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId)));
    await db
      .delete(schema.groupApplications)
      .where(and(eq(schema.groupApplications.groupId, groupId), eq(schema.groupApplications.userId, userId)));
  }

  async isGroupAdmin(groupId: string, userId: number): Promise<boolean> {
    const [member] = await db
      .select()
      .from(schema.groupMembers)
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, userId),
      ));
    if (!member) return false;
    return member.role === 'owner' || member.role === 'admin';
  }

  async getUserGroups(userId: number): Promise<(schema.Group & { role: string })[]> {
    const results = await db
      .select({
        group: schema.groups,
        role: schema.groupMembers.role,
      })
      .from(schema.groupMembers)
      .innerJoin(schema.groups, eq(schema.groupMembers.groupId, schema.groups.id))
      .where(eq(schema.groupMembers.userId, userId));
    
    return results.map(r => ({ ...r.group, role: r.role }));
  }

  async getGroupIdeas(groupId: string): Promise<schema.Idea[]> {
    const group = await this.getGroup(groupId);
    if (!group) return [];
    return db
      .select()
      .from(schema.ideas)
      .where(eq(schema.ideas.brand, group.slug))
      .orderBy(desc(schema.ideas.createdAt));
  }

  async getGroupStats(groupId: string): Promise<{ memberCount: number; ideaCount: number; pendingInviteCount: number }> {
    const group = await this.getGroup(groupId);
    if (!group) return { memberCount: 0, ideaCount: 0, pendingInviteCount: 0 };

    const [memberResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.groupMembers)
      .where(eq(schema.groupMembers.groupId, groupId));

    const [ideaResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.ideas)
      .where(eq(schema.ideas.brand, group.slug));

    const [inviteResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.groupInvites)
      .where(and(eq(schema.groupInvites.groupId, groupId), eq(schema.groupInvites.status, 'pending')));

    return {
      memberCount: memberResult?.count || 0,
      ideaCount: ideaResult?.count || 0,
      pendingInviteCount: inviteResult?.count || 0,
    };
  }

  async createGroupInvite(data: schema.InsertGroupInvite): Promise<schema.GroupInvite> {
    const [invite] = await db.insert(schema.groupInvites).values(data).returning();
    return invite;
  }

  async getGroupInvites(groupId: string): Promise<(schema.GroupInvite & { inviterName: string | null })[]> {
    const invites = await db
      .select({
        invite: schema.groupInvites,
        inviterName: schema.users.fullName,
      })
      .from(schema.groupInvites)
      .innerJoin(schema.users, eq(schema.groupInvites.invitedBy, schema.users.id))
      .where(eq(schema.groupInvites.groupId, groupId))
      .orderBy(desc(schema.groupInvites.createdAt));
    
    return invites.map(i => ({ ...i.invite, inviterName: i.inviterName }));
  }

  async getGroupInviteByToken(token: string): Promise<(schema.GroupInvite & { group: schema.Group }) | undefined> {
    const [result] = await db
      .select({
        invite: schema.groupInvites,
        group: schema.groups,
      })
      .from(schema.groupInvites)
      .innerJoin(schema.groups, eq(schema.groupInvites.groupId, schema.groups.id))
      .where(eq(schema.groupInvites.token, token));
    
    if (!result) return undefined;
    return { ...result.invite, group: result.group };
  }

  async getPendingGroupInvitesByEmail(email: string): Promise<schema.GroupInvite[]> {
    return db
      .select()
      .from(schema.groupInvites)
      .where(and(
        sql`lower(${schema.groupInvites.email}) = lower(${email})`,
        eq(schema.groupInvites.status, 'pending')
      ));
  }

  async acceptGroupInvite(token: string, userId: number): Promise<void> {
    const invite = await this.getGroupInviteByToken(token);
    if (!invite || invite.status !== 'pending') return;

    await db
      .update(schema.groupInvites)
      .set({ status: 'accepted' })
      .where(eq(schema.groupInvites.token, token));

    await this.addGroupMember(invite.groupId, userId, 'member');
  }

  async revokeGroupInvite(inviteId: string, groupId: string): Promise<void> {
    await db
      .update(schema.groupInvites)
      .set({ status: 'expired' as any })
      .where(and(eq(schema.groupInvites.id, inviteId), eq(schema.groupInvites.groupId, groupId)));
  }

  async updateGroupInvite(inviteId: string, data: Partial<schema.GroupInvite>): Promise<schema.GroupInvite | undefined> {
    const [updated] = await db
      .update(schema.groupInvites)
      .set(data)
      .where(eq(schema.groupInvites.id, inviteId))
      .returning();
    return updated;
  }

  async transferGroupOwnership(groupId: string, currentOwnerId: number, newOwnerId: number): Promise<void> {
    await db
      .update(schema.groupMembers)
      .set({ role: 'admin' })
      .where(and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, currentOwnerId)));
    await db
      .update(schema.groupMembers)
      .set({ role: 'owner' })
      .where(and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, newOwnerId)));
  }

  async getGroupApplications(groupId: string): Promise<(schema.GroupApplication & { user: User; profile: Profile | null })[]> {
    const results = await db
      .select({
        id: schema.groupApplications.id,
        groupId: schema.groupApplications.groupId,
        userId: schema.groupApplications.userId,
        motivation: schema.groupApplications.motivation,
        answers: schema.groupApplications.answers,
        projectTitle: schema.groupApplications.projectTitle,
        universityName: schema.groupApplications.universityName,
        graduationYear: schema.groupApplications.graduationYear,
        major: schema.groupApplications.major,
        teamEmails: schema.groupApplications.teamEmails,
        status: schema.groupApplications.status,
        reviewedBy: schema.groupApplications.reviewedBy,
        reviewedAt: schema.groupApplications.reviewedAt,
        reminderSent: schema.groupApplications.reminderSent,
        createdAt: schema.groupApplications.createdAt,
        user: schema.users,
        profile: schema.profiles,
      })
      .from(schema.groupApplications)
      .innerJoin(schema.users, eq(schema.groupApplications.userId, schema.users.id))
      .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
      .where(eq(schema.groupApplications.groupId, groupId))
      .orderBy(desc(schema.groupApplications.createdAt));

    return results.map(r => ({
      id: r.id,
      groupId: r.groupId,
      userId: r.userId,
      motivation: r.motivation,
      answers: r.answers,
      projectTitle: r.projectTitle,
      teamEmails: r.teamEmails,
      status: r.status,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt,
      reminderSent: r.reminderSent,
      createdAt: r.createdAt,
      user: r.user,
      profile: r.profile,
    }));
  }

  async getUserApplications(userId: number): Promise<(schema.GroupApplication & { groupName: string; groupSlug: string })[]> {
    const results = await db
      .select({
        application: schema.groupApplications,
        groupName: schema.groups.name,
        groupSlug: schema.groups.slug,
      })
      .from(schema.groupApplications)
      .innerJoin(schema.groups, eq(schema.groupApplications.groupId, schema.groups.id))
      .where(eq(schema.groupApplications.userId, userId))
      .orderBy(desc(schema.groupApplications.createdAt));

    return results.map(r => ({ ...r.application, groupName: r.groupName, groupSlug: r.groupSlug }));
  }

  async getUserApplicationForGroup(userId: number, groupId: string): Promise<schema.GroupApplication | undefined> {
    const [result] = await db
      .select()
      .from(schema.groupApplications)
      .where(and(eq(schema.groupApplications.userId, userId), eq(schema.groupApplications.groupId, groupId)))
      .orderBy(desc(schema.groupApplications.createdAt))
      .limit(1);
    return result;
  }

  async createGroupApplication(data: schema.InsertGroupApplication): Promise<schema.GroupApplication> {
    const [app] = await db.insert(schema.groupApplications).values(data).returning();
    return app;
  }

  async updateGroupApplication(id: string, status: "approved" | "rejected", reviewedBy: number): Promise<schema.GroupApplication | undefined> {
    const [updated] = await db
      .update(schema.groupApplications)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(schema.groupApplications.id, id))
      .returning();
    return updated;
  }

  async updateGroupApplicationAnswers(id: string, answers: { question: string; answer: string }[], motivation: string, projectTitle?: string, teamEmails?: string[], extra?: { universityName?: string; graduationYear?: string; major?: string }): Promise<schema.GroupApplication | undefined> {
    const setData: any = { answers, motivation };
    if (projectTitle !== undefined) setData.projectTitle = projectTitle;
    if (teamEmails !== undefined) setData.teamEmails = teamEmails;
    if (extra?.universityName !== undefined) setData.universityName = extra.universityName;
    if (extra?.graduationYear !== undefined) setData.graduationYear = extra.graduationYear;
    if (extra?.major !== undefined) setData.major = extra.major;
    const [updated] = await db
      .update(schema.groupApplications)
      .set(setData)
      .where(eq(schema.groupApplications.id, id))
      .returning();
    return updated;
  }

  async getApplicationsByTeamEmail(email: string): Promise<schema.GroupApplication[]> {
    const results = await db
      .select()
      .from(schema.groupApplications)
      .where(and(
        sql`${schema.groupApplications.teamEmails}::jsonb @> ${JSON.stringify([email.toLowerCase()])}::jsonb`,
        or(
          eq(schema.groupApplications.status, 'pending'),
          eq(schema.groupApplications.status, 'approved')
        )
      ));
    return results;
  }

  async getGroupIdeaRatings(groupId: string): Promise<(schema.GroupIdeaRating & { raterName: string | null; ideaTitle: string })[]> {
    const results = await db
      .select({
        rating: schema.groupIdeaRatings,
        raterName: schema.users.fullName,
        ideaTitle: schema.ideas.title,
      })
      .from(schema.groupIdeaRatings)
      .innerJoin(schema.users, eq(schema.groupIdeaRatings.ratedBy, schema.users.id))
      .innerJoin(schema.ideas, eq(schema.groupIdeaRatings.ideaId, schema.ideas.id))
      .where(eq(schema.groupIdeaRatings.groupId, groupId))
      .orderBy(desc(schema.groupIdeaRatings.updatedAt));

    return results.map(r => ({ ...r.rating, raterName: r.raterName, ideaTitle: r.ideaTitle }));
  }

  async getIdeaRatings(ideaId: string, groupId: string): Promise<(schema.GroupIdeaRating & { raterName: string | null })[]> {
    const results = await db
      .select({
        rating: schema.groupIdeaRatings,
        raterName: schema.users.fullName,
      })
      .from(schema.groupIdeaRatings)
      .innerJoin(schema.users, eq(schema.groupIdeaRatings.ratedBy, schema.users.id))
      .where(and(eq(schema.groupIdeaRatings.ideaId, ideaId), eq(schema.groupIdeaRatings.groupId, groupId)));

    return results.map(r => ({ ...r.rating, raterName: r.raterName }));
  }

  async upsertGroupIdeaRating(data: { groupId: string; ideaId: string; ratedBy: number; score: number; feedback?: string }): Promise<schema.GroupIdeaRating> {
    const result = await db.execute(sql`
      INSERT INTO group_idea_ratings (group_id, idea_id, rated_by, score, feedback)
      VALUES (${data.groupId}, ${data.ideaId}, ${data.ratedBy}, ${data.score}, ${data.feedback || null})
      ON CONFLICT (group_id, idea_id, rated_by) DO UPDATE
      SET score = ${data.score}, feedback = ${data.feedback || null}, updated_at = NOW()
      RETURNING *
    `);
    return result.rows[0] as any as schema.GroupIdeaRating;
  }

  async getGroupIdeasWithRatings(groupId: string): Promise<(schema.Idea & { creatorName: string | null; avgScore: number | null; ratingCount: number })[]> {
    const group = await this.getGroup(groupId);
    if (!group) return [];

    const ideas = await db
      .select()
      .from(schema.ideas)
      .where(eq(schema.ideas.brand, group.slug))
      .orderBy(desc(schema.ideas.createdAt));

    const results = await Promise.all(ideas.map(async (idea) => {
      const creator = await this.getUser(idea.createdBy);
      const ratings = await db
        .select({ score: schema.groupIdeaRatings.score })
        .from(schema.groupIdeaRatings)
        .where(and(eq(schema.groupIdeaRatings.ideaId, idea.id), eq(schema.groupIdeaRatings.groupId, groupId)));

      const ratingCount = ratings.length;
      const avgScore = ratingCount > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.score, 0) / ratingCount) * 10) / 10
        : null;

      return {
        ...idea,
        creatorName: creator?.fullName || null,
        avgScore,
        ratingCount,
      };
    }));

    return results;
  }

}

export const storage = new DatabaseStorage();
