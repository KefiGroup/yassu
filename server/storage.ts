import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";
import * as schema from "../shared/schema";
import type { 
  User, Profile, Idea, Team, Project, University, 
  WorkflowRun, WorkflowArtifact, Notification, UserRole, InsertUser
} from "../shared/schema";

export interface ProfileWithMatchingSkills extends Profile {
  matchingSkills: string[];
  matchCount: number;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProfile(userId: number): Promise<Profile | undefined>;
  updateProfile(userId: number, data: Partial<Profile>): Promise<Profile | undefined>;
  createProfile(userId: number, data: Partial<Profile>): Promise<Profile>;
  findProfilesBySkills(skills: string[], excludeUserId?: number): Promise<ProfileWithMatchingSkills[]>;
  
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
}

export const storage = new DatabaseStorage();
