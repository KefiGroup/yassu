import { db } from "./db";
import { eq, desc, and, or, sql, inArray } from "drizzle-orm";
import * as schema from "../shared/schema";
import type { 
  User, Profile, Idea, Team, Project, University, 
  WorkflowRun, WorkflowArtifact, Notification, UserRole, InsertUser,
  JoinRequest, TeamInvite, IdeaWorkflowSection
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

  async getProfilesByYassuRole(role: "ambassador" | "advisor"): Promise<Profile[]> {
    return db.select().from(schema.profiles)
      .where(eq(schema.profiles.yassuRole, role))
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
    if (userId) {
      return db.select().from(schema.ideas)
        .where(or(eq(schema.ideas.isPublic, true), eq(schema.ideas.createdBy, userId)))
        .orderBy(desc(schema.ideas.createdAt));
    }
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
    // Get advisors and ambassadors who can be invited
    const profiles = await db.select().from(schema.profiles)
      .where(
        and(
          sql`${schema.profiles.yassuRole} IS NOT NULL`,
          sql`${schema.profiles.userId} != ${excludeUserId}`
        )
      )
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
        eq(schema.ideaWorkflowSections.sectionType, sectionType as any)
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
        .values({ ideaId, sectionType: sectionType as any, content, aiGenerated })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
