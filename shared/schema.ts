import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const appRoleEnum = pgEnum("app_role", ["student", "alumni", "founder_pro", "investor", "sponsor", "admin"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "verified", "rejected"]);
export const ideaStageEnum = pgEnum("idea_stage", ["concept", "validating", "building", "launched"]);
export const workflowTypeEnum = pgEnum("workflow_type", [
  "idea_founder_fit",
  "competitive_landscape",
  "risk_moat_builder",
  "product_mvp_design",
  "team_talent",
  "launch_plan",
  "school_advantage",
  "funding_pitch",
  "business_plan"
]);
export const pipelineStageEnum = pgEnum("pipeline_stage", ["watchlist", "diligence", "pass", "invest"]);

export const universities = pgTable("universities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  logoUrl: text("logo_url"),
  domain: text("domain").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clubs = pgTable("clubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  universityId: uuid("university_id").references(() => universities.id),
  name: text("name").notNull(),
  description: text("description"),
  inviteCode: text("invite_code").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const universityResources = pgTable("university_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  universityId: uuid("university_id").references(() => universities.id),
  type: text("type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  contactEmail: text("contact_email"),
  url: text("url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  email: text("email"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  universityId: uuid("university_id").references(() => universities.id),
  otherUniversity: text("other_university"),
  clubId: uuid("club_id").references(() => clubs.id),
  major: text("major"),
  graduationYear: integer("graduation_year"),
  skills: text("skills").array().default([]),
  interests: text("interests").array().default([]),
  availability: text("availability"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  bio: text("bio"),
  verificationStatus: verificationStatusEnum("verification_status").default("pending"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: appRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ideas = pgTable("ideas", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  title: text("title").notNull(),
  problem: text("problem").notNull(),
  solution: text("solution"),
  targetUser: text("target_user"),
  whyNow: text("why_now"),
  assumptions: text("assumptions"),
  desiredTeammates: text("desired_teammates"),
  expectedTimeline: text("expected_timeline"),
  stage: ideaStageEnum("stage").default("concept"),
  universityId: uuid("university_id").references(() => universities.id),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ideaTags = pgTable("idea_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  ideaId: uuid("idea_id").references(() => ideas.id).notNull(),
  tag: text("tag").notNull(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ideaId: uuid("idea_id").references(() => ideas.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const joinRequests = pgTable("join_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  ideaId: uuid("idea_id").references(() => ideas.id),
  teamId: uuid("team_id").references(() => teams.id),
  message: text("message"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id).notNull(),
  ideaId: uuid("idea_id").references(() => ideas.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectDocs = pgTable("project_docs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  content: text("content").default(""),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectTasks = pgTable("project_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("todo"),
  assignedTo: integer("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  ideaId: uuid("idea_id").references(() => ideas.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  workflowType: workflowTypeEnum("workflow_type").notNull(),
  inputs: text("inputs").default("{}"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const workflowArtifacts = pgTable("workflow_artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowRunId: uuid("workflow_run_id").references(() => workflowRuns.id).notNull(),
  version: integer("version").default(1),
  content: text("content"),
  metadata: text("metadata").default("{}"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  ideaId: uuid("idea_id").references(() => ideas.id),
  projectId: uuid("project_id").references(() => projects.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sponsorChallenges = pgTable("sponsor_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  sponsorId: integer("sponsor_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  prize: text("prize"),
  deadline: timestamp("deadline"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const challengeApplications = pgTable("challenge_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengeId: uuid("challenge_id").references(() => sponsorChallenges.id).notNull(),
  teamId: uuid("team_id").references(() => teams.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  pitch: text("pitch"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const investingPipeline = pgTable("investing_pipeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  flaggedBy: integer("flagged_by").references(() => users.id).notNull(),
  stage: pipelineStageEnum("stage").default("watchlist"),
  tractionScore: integer("traction_score").default(0),
  teamScore: integer("team_score").default(0),
  marketScore: integer("market_score").default(0),
  defensibilityScore: integer("defensibility_score").default(0),
  notes: text("notes"),
  decisionNotes: text("decision_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message"),
  read: boolean("read").default(false),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIdeaSchema = createInsertSchema(ideas).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUniversitySchema = createInsertSchema(universities).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type University = typeof universities.$inferSelect;
export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type WorkflowArtifact = typeof workflowArtifacts.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
