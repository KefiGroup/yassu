import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const appRoleEnum = pgEnum("app_role", ["student", "alumni", "founder_pro", "investor", "sponsor", "admin"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "verified", "rejected"]);
export const ideaStageEnum = pgEnum("idea_stage", ["idea_posted", "business_plan", "find_advisors", "form_team", "build_mvp", "yassu_foundry", "launched"]);
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
export const yassuRoleEnum = pgEnum("yassu_role", ["ambassador", "advisor"]);
export const badgeTypeEnum = pgEnum("badge_type", ["ambassador", "advisor"]);
export const connectionStatusEnum = pgEnum("connection_status", ["pending", "accepted", "rejected", "cancelled"]);

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

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const digestEmailLog = pgTable("digest_email_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  ideasCount: integer("ideas_count").default(0).notNull(),
  matchesCount: integer("matches_count").default(0).notNull(),
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
  clubType: text("club_type"),
  verificationStatus: verificationStatusEnum("verification_status").default("pending"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  yassuRole: yassuRoleEnum("yassu_role"),
  // Enhanced Profile 2.0 fields
  headline: text("headline"), // e.g., "Product Designer | Ex-Google Intern"
  lookingFor: text("looking_for").array().default([]), // ["Full-time", "Part-time", "Advisor", "Co-founder"]
  experience: text("experience"), // JSON string of work/project history
  reputationScore: integer("reputation_score").default(0), // Calculated reputation score
  projectsCompleted: integer("projects_completed").default(0), // Number of completed projects
  endorsements: integer("endorsements").default(0), // Number of endorsements received
  // Notification preferences
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true),
  ideaUpdatesEnabled: boolean("idea_updates_enabled").default(true),
  teamInvitesEnabled: boolean("team_invites_enabled").default(true),
  messageNotificationsEnabled: boolean("message_notifications_enabled").default(true),
  profilePublic: boolean("profile_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: appRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profileBadges = pgTable("profile_badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").references(() => users.id).notNull(),
  badgeType: badgeTypeEnum("badge_type").notNull(),
  awardedBy: integer("awarded_by").references(() => users.id).notNull(),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
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
  stage: ideaStageEnum("stage").default("idea_posted"),
  universityId: uuid("university_id").references(() => universities.id),
  isPublic: boolean("is_public").default(false),
  isFeatured: boolean("is_featured").default(false),
  mvpLink: text("mvp_link"),
  coverImage: text("cover_image"),
  brand: text("brand"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ideaTags = pgTable("idea_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  ideaId: uuid("idea_id").references(() => ideas.id).notNull(),
  tag: text("tag").notNull(),
});

export const industries = pgTable("industries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const ideaIndustries = pgTable("idea_industries", {
  id: serial("id").primaryKey(),
  ideaId: uuid("idea_id").references(() => ideas.id, { onDelete: "cascade" }).notNull(),
  industryId: integer("industry_id").references(() => industries.id, { onDelete: "cascade" }).notNull(),
});

export const profileIndustries = pgTable("profile_industries", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  industryId: integer("industry_id").references(() => industries.id, { onDelete: "cascade" }).notNull(),
});

export const ideaNextSteps = pgTable("idea_next_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  ideaId: uuid("idea_id").references(() => ideas.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // validation, team, product, market, funding
  priority: text("priority").notNull(), // high, medium, low
  completed: boolean("completed").default(false),
  estimatedTime: text("estimated_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pitchDecks = pgTable("pitch_decks", {
  id: uuid("id").primaryKey().defaultRandom(),
  ideaId: uuid("idea_id").references(() => ideas.id, { onDelete: "cascade" }).notNull(),
  investorMode: text("investor_mode").notNull(), // "angel" | "vc"
  deckType: text("deck_type").notNull(), // "full" | "warm_intro"
  targetRaise: text("target_raise"),
  slides: text("slides").notNull(), // JSON string of slide content
  metricsValidation: text("metrics_validation"), // JSON string of metrics
  finalDeckUrl: text("final_deck_url"), // URL to Manus/designed deck
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pitchPreparations = pgTable("pitch_preparations", {
  id: uuid("id").primaryKey().defaultRandom(),
  ideaId: uuid("idea_id").references(() => ideas.id, { onDelete: "cascade" }).notNull(),
  investorMode: text("investor_mode").notNull(), // "angel" | "vc"
  deliveryScripts: text("delivery_scripts").notNull(), // JSON array of slide scripts
  objections: text("objections"), // JSON array of objections
  rehearsalQuestions: text("rehearsal_questions"), // JSON array of Q&A
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  // Structured Application fields
  motivation: text("motivation"), // Why interested
  role: text("role"), // Desired role
  timeCommitment: text("time_commitment"), // Hours/week
  experience: text("experience"), // Relevant experience
  // Interest type: 'collaborate' or 'invest'
  interestType: text("interest_type").default("collaborate"),
  // Investor-specific fields
  investorType: text("investor_type"), // Angel, VC, etc.
  investmentRange: text("investment_range"), // $10k-$25k, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamInvites = pgTable("team_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  ideaId: uuid("idea_id").references(() => ideas.id).notNull(),
  inviterId: integer("inviter_id").references(() => users.id).notNull(),
  inviteeId: integer("invitee_id").references(() => users.id).notNull(),
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

// Editable workflow sections for business plans - allows users to customize AI-generated content
// Section types: executive_summary, founder_fit, competitive_landscape, risk_and_moat, 
// mvp_design, team_and_talent, launch_plan, school_advantage, funding_pitch
export const ideaWorkflowSections = pgTable("idea_workflow_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  ideaId: uuid("idea_id").references(() => ideas.id).notNull(),
  sectionType: text("section_type").notNull(),
  content: text("content").default(""),
  aiGenerated: boolean("ai_generated").default(true), // tracks if content was auto-populated from AI
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User connections - LinkedIn/Facebook style connection requests
export const connections = pgTable("connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: integer("requester_id").references(() => users.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  status: connectionStatusEnum("status").default("pending").notNull(),
  message: text("message"),
  acceptToken: text("accept_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
});

// Direct messages between users
export const directMessages = pgTable("direct_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  emailNotificationSent: boolean("email_notification_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Team group messages (like Facebook group chat)
export const teamMessages = pgTable("team_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Track which team messages each user has read
export const teamMessageReads = pgTable("team_message_reads", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  lastReadAt: timestamp("last_read_at").defaultNow().notNull(),
});

export const announcementTypeEnum = pgEnum("announcement_type", ["maintenance", "event", "update", "general"]);
export const announcementPriorityEnum = pgEnum("announcement_priority", ["normal", "important", "urgent"]);

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: announcementTypeEnum("type").default("general").notNull(),
  priority: announcementPriorityEnum("priority").default("normal").notNull(),
  startsAt: timestamp("starts_at").defaultNow().notNull(),
  endsAt: timestamp("ends_at"),
  eventDate: timestamp("event_date"),
  eventEndDate: timestamp("event_end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const suggestionStatusEnum = pgEnum("suggestion_status", ["new", "reviewed", "implemented", "dismissed"]);

export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  suggestion: text("suggestion").notNull(),
  status: suggestionStatusEnum("status").default("new").notNull(),
  adminNotes: text("admin_notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  inboxConversationId: integer("inbox_conversation_id").references(() => inboxConversations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Foundry Events (Roadshows, Workshops, etc.)
export const eventTypeEnum = pgEnum("event_type", ["roadshow", "workshop", "office_hours", "demo_day", "networking", "other"]);
export const rsvpStatusEnum = pgEnum("rsvp_status", ["going", "maybe", "not_going"]);

export const foundryEvents = pgTable("foundry_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  eventType: eventTypeEnum("event_type").default("roadshow").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  timezone: text("timezone").default("America/New_York"),
  zoomMeetingId: text("zoom_meeting_id"),
  zoomJoinUrl: text("zoom_join_url"),
  zoomStartUrl: text("zoom_start_url"),
  zoomPasscode: text("zoom_passcode"),
  capacity: integer("capacity"),
  isPublic: boolean("is_public").default(true).notNull(),
  isCancelled: boolean("is_cancelled").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventRsvps = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => foundryEvents.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: rsvpStatusEnum("status").default("going").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookingStatusEnum = pgEnum("booking_status", ["pending", "approved", "rejected", "cancelled"]);

export const roadshowBookings = pgTable("roadshow_bookings", {
  id: serial("id").primaryKey(),
  ideaId: uuid("idea_id").references(() => ideas.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  eventId: integer("event_id").references(() => foundryEvents.id, { onDelete: "set null" }),
  preferredDate: timestamp("preferred_date"),
  pitchDuration: integer("pitch_duration").default(10),
  message: text("message"),
  status: bookingStatusEnum("status").default("pending").notNull(),
  adminNotes: text("admin_notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFoundryEventSchema = createInsertSchema(foundryEvents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRoadshowBookingSchema = createInsertSchema(roadshowBookings).omit({ id: true, createdAt: true, updatedAt: true, reviewedAt: true });

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIdeaSchema = createInsertSchema(ideas).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUniversitySchema = createInsertSchema(universities).omit({ id: true, createdAt: true });
export const insertConnectionSchema = createInsertSchema(connections).omit({ id: true, createdAt: true, respondedAt: true });
export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({ id: true, createdAt: true, read: true, emailNotificationSent: true });
export const insertTeamMessageSchema = createInsertSchema(teamMessages).omit({ id: true, createdAt: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSuggestionSchema = createInsertSchema(suggestions).omit({ id: true, createdAt: true, reviewedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type DigestEmailLog = typeof digestEmailLog.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type University = typeof universities.$inferSelect;
export type WorkflowRun = typeof workflowRuns.$inferSelect;
export type WorkflowArtifact = typeof workflowArtifacts.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type ProfileBadge = typeof profileBadges.$inferSelect;
export type JoinRequest = typeof joinRequests.$inferSelect;
export type TeamInvite = typeof teamInvites.$inferSelect;
export type IdeaWorkflowSection = typeof ideaWorkflowSections.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type TeamMessage = typeof teamMessages.$inferSelect;
export type InsertTeamMessage = z.infer<typeof insertTeamMessageSchema>;
export type TeamMessageRead = typeof teamMessageReads.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type FoundryEvent = typeof foundryEvents.$inferSelect;
export type InsertFoundryEvent = z.infer<typeof insertFoundryEventSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;
export type RoadshowBooking = typeof roadshowBookings.$inferSelect;
export type InsertRoadshowBooking = z.infer<typeof insertRoadshowBookingSchema>;

// Admin Inbox - for managing user feedback conversations
export const inboxConversationTypeEnum = pgEnum("inbox_conversation_type", ["feedback", "support", "general"]);

export const inboxConversations = pgTable("inbox_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  userEmail: text("user_email").notNull(),
  userName: text("user_name"),
  subject: text("subject").notNull(),
  conversationType: inboxConversationTypeEnum("conversation_type").default("feedback").notNull(),
  isResolved: boolean("is_resolved").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  outlookConversationId: text("outlook_conversation_id"),
});

export const inboxMessages = pgTable("inbox_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => inboxConversations.id).notNull(),
  senderType: text("sender_type").notNull(), // "user" or "admin"
  senderId: integer("sender_id").references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  outlookMessageId: text("outlook_message_id"),
  attachmentUrl: text("attachment_url"), // Screenshot/image attachment
});

export const insertInboxConversationSchema = createInsertSchema(inboxConversations).omit({ id: true, createdAt: true, lastMessageAt: true });
export const insertInboxMessageSchema = createInsertSchema(inboxMessages).omit({ id: true, createdAt: true });

export type InboxConversation = typeof inboxConversations.$inferSelect;
export type InsertInboxConversation = z.infer<typeof insertInboxConversationSchema>;
export type InboxMessage = typeof inboxMessages.$inferSelect;
export type InsertInboxMessage = z.infer<typeof insertInboxMessageSchema>;

export const insertIndustrySchema = createInsertSchema(industries).omit({ id: true });
export type Industry = typeof industries.$inferSelect;
export type InsertIndustry = z.infer<typeof insertIndustrySchema>;
export type IdeaIndustry = typeof ideaIndustries.$inferSelect;
export type ProfileIndustry = typeof profileIndustries.$inferSelect;

export const groupRoleEnum = pgEnum("group_role", ["owner", "admin", "member", "judge"]);
export const groupInviteStatusEnum = pgEnum("group_invite_status", ["pending", "accepted", "expired"]);
export const groupApplicationStatusEnum = pgEnum("group_application_status", ["pending", "approved", "rejected"]);

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  logoUrl: text("logo_url"),
  universityId: uuid("university_id").references(() => universities.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMembers = pgTable("group_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: groupRoleEnum("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const groupInvites = pgTable("group_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  invitedBy: integer("invited_by").references(() => users.id).notNull(),
  status: groupInviteStatusEnum("status").default("pending").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupApplications = pgTable("group_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  motivation: text("motivation"),
  status: groupApplicationStatusEnum("status").default("pending").notNull(),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupIdeaRatings = pgTable("group_idea_ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "cascade" }).notNull(),
  ideaId: uuid("idea_id").references(() => ideas.id, { onDelete: "cascade" }).notNull(),
  ratedBy: integer("rated_by").references(() => users.id).notNull(),
  score: integer("score").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGroupSchema = createInsertSchema(groups).omit({ id: true, createdAt: true });
export const insertGroupMemberSchema = createInsertSchema(groupMembers).omit({ id: true, joinedAt: true });
export const insertGroupInviteSchema = createInsertSchema(groupInvites).omit({ id: true, createdAt: true });
export const insertGroupApplicationSchema = createInsertSchema(groupApplications).omit({ id: true, createdAt: true, reviewedAt: true });
export const insertGroupIdeaRatingSchema = createInsertSchema(groupIdeaRatings).omit({ id: true, createdAt: true, updatedAt: true });

export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;
export type GroupInvite = typeof groupInvites.$inferSelect;
export type InsertGroupInvite = z.infer<typeof insertGroupInviteSchema>;
export type GroupApplication = typeof groupApplications.$inferSelect;
export type InsertGroupApplication = z.infer<typeof insertGroupApplicationSchema>;
export type GroupIdeaRating = typeof groupIdeaRatings.$inferSelect;
export type InsertGroupIdeaRating = z.infer<typeof insertGroupIdeaRatingSchema>;

export const PREDEFINED_INDUSTRIES = [
  { name: "Technology & Software", slug: "technology-software" },
  { name: "Healthcare & Biotech", slug: "healthcare-biotech" },
  { name: "Finance & Fintech", slug: "finance-fintech" },
  { name: "Education & EdTech", slug: "education-edtech" },
  { name: "E-commerce & Retail", slug: "ecommerce-retail" },
  { name: "AI & Machine Learning", slug: "ai-machine-learning" },
  { name: "Clean Energy & CleanTech", slug: "clean-energy-cleantech" },
  { name: "Consumer Products", slug: "consumer-products" },
  { name: "B2B Services", slug: "b2b-services" },
  { name: "Food & Beverage", slug: "food-beverage" },
  { name: "Real Estate & PropTech", slug: "real-estate-proptech" },
  { name: "Transportation & Mobility", slug: "transportation-mobility" },
  { name: "Media & Entertainment", slug: "media-entertainment" },
  { name: "Social Impact & Nonprofit", slug: "social-impact-nonprofit" },
  { name: "Gaming & Esports", slug: "gaming-esports" },
] as const;

// Chat schema for OpenAI integration
export * from "./models/chat";
