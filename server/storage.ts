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

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  
  getProfile(userId: number): Promise<Profile | undefined>;
  updateProfile(userId: number, data: Partial<Profile>): Promise<Profile | undefined>;
  createProfile(userId: number, data: Partial<Profile>): Promise<Profile>;
  findProfilesBySkills(skills: string[], excludeUserId?: number): Promise<ProfileWithMatchingSkills[]>;
  getProfilesByYassuRole(role: "ambassador" | "advisor"): Promise<Profile[]>;
  getAllUsersForMatching(): Promise<any[]>;
  
  getUserRoles(userId: number): Promise<UserRole[]>;
  addUserRole(userId: number, role: string): Promise<void>;
  
  getUniversities(): Promise<University[]>;
  getUniversity(id: string): Promise<University | undefined>;
  
  getIdeas(userId?: number): Promise<Idea[]>;
  getIdea(id: string): Promise<Idea | undefined>;
  createIdea(data: Partial<Idea>): Promise<Idea>;
  updateIdea(id: string, data: Partial<Idea>): Promise<Idea | undefined>;
  deleteIdea(id: string): Promise<void>;
  
  getIdeaTags(ideaId: string): Promise<{ tag: string }[]>;
  addIdeaTag(ideaId: string, tag: string): Promise<void>;
  
  getTeams(userId?: number): Promise<Team[]>;
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

  async getProfile(userId: number): Promise<Profile | undefined> {
    const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
    return profile;
  }

  async updateProfile(userId: number, data: Partial<Profile>): Promise<Profile | undefined> {
    const [updated] = await db
      .update(schema.profiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.profiles.userId, userId))
      .returning();
    return updated;
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

  async getTeams(userId?: number): Promise<Team[]> {
    return db.select().from(schema.teams).orderBy(desc(schema.teams.createdAt));
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
    // Get profiles who have ambassador or advisor badges (awarded by superadmin)
    const badges = await db.select().from(schema.profileBadges);
    const userIdsWithBadges = [...new Set(badges.map(b => b.userId))].filter(id => id !== excludeUserId);
    
    if (userIdsWithBadges.length === 0) return [];
    
    const profiles = await db.select().from(schema.profiles)
      .where(inArray(schema.profiles.userId, userIdsWithBadges))
      .orderBy(schema.profiles.fullName);
    
    if (!ideaId) return profiles;
    
    // Filter out already invited users for this idea
    const existingInvites = await db.select().from(schema.teamInvites)
      .where(eq(schema.teamInvites.ideaId, ideaId));
    
    const existingRequests = await db.select().from(schema.joinRequests)
      .where(eq(schema.joinRequests.ideaId, ideaId));
    
    const excludeUserIds = new Set([
      ...existingInvites.map(i => i.inviteeId),
      ...existingRequests.map(r => r.userId)
    ]);
    
    return profiles.filter(p => !excludeUserIds.has(p.userId));
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
        .values({ requesterId, recipientId, message, status: 'pending' })
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
      .set({ status: 'accepted', respondedAt: new Date() })
      .where(eq(schema.connections.id, connectionId))
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
}

export const storage = new DatabaseStorage();
