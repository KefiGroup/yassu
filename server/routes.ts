import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generateBusinessPlan } from "./ai";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).session?.userId || "unknown";
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `avatar-${userId}-${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG and WebP are allowed."));
    }
  },
});

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export function registerRoutes(app: Express): void {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, fullName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ email, password: hashedPassword, fullName });
      
      await storage.createProfile(user.id, { 
        email, 
        fullName,
        verificationStatus: "pending",
        onboardingCompleted: false,
        skills: [],
        interests: []
      });
      await storage.addUserRole(user.id, "student");

      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, fullName: user.fullName } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, fullName: user.fullName } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if user exists (but don't reveal this to prevent email enumeration)
      const user = await storage.getUserByEmail(email);
      
      // TODO: In production, integrate with an email service to send reset link
      // For now, we just log and return success regardless
      if (user) {
        console.log(`Password reset requested for user: ${user.email}`);
        // In production: generate reset token, save to DB, send email
      }

      // Always return success to prevent email enumeration attacks
      res.json({ success: true, message: "If an account exists, a reset email will be sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, hashedPassword);

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const profile = await storage.getProfile(user.id);
      const roles = await storage.getUserRoles(user.id);

      res.json({
        user: { id: user.id, email: user.email, fullName: user.fullName },
        profile,
        roles,
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/profile", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const profile = await storage.getProfile(req.session.userId);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/profile", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const data = { ...req.body };
      
      // Validate yassuRole if provided
      if (data.yassuRole !== undefined) {
        const validRoles = ['ambassador', 'advisor', null];
        if (!validRoles.includes(data.yassuRole)) {
          return res.status(400).json({ error: "Invalid Yassu role" });
        }
      }
      
      const profile = await storage.updateProfile(req.session.userId, data);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/profile/avatar", avatarUpload.single("avatar"), async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const avatarUrl = `/uploads/${file.filename}`;
      await storage.updateProfile(req.session.userId, { avatarUrl });

      res.json({ avatarUrl });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  app.post("/api/profiles/match-skills", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { skills } = req.body;
      
      if (!skills || !Array.isArray(skills)) {
        return res.status(400).json({ error: "Skills array is required" });
      }

      const matchedProfiles = await storage.findProfilesBySkills(
        skills, 
        req.session.userId
      );
      
      res.json(matchedProfiles);
    } catch (error) {
      console.error("Profile match error:", error);
      res.status(500).json({ error: "Failed to find matching profiles" });
    }
  });

  app.get("/api/advisors", async (_req: Request, res: Response) => {
    try {
      const advisors = await storage.getProfilesByYassuRole("advisor");
      res.json(advisors);
    } catch (error) {
      console.error("Fetch advisors error:", error);
      res.status(500).json({ error: "Failed to fetch advisors" });
    }
  });

  app.get("/api/ambassadors", async (_req: Request, res: Response) => {
    try {
      const ambassadors = await storage.getProfilesByYassuRole("ambassador");
      res.json(ambassadors);
    } catch (error) {
      console.error("Fetch ambassadors error:", error);
      res.status(500).json({ error: "Failed to fetch ambassadors" });
    }
  });

  app.get("/api/universities", async (_req: Request, res: Response) => {
    try {
      const universities = await storage.getUniversities();
      res.json(universities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch universities" });
    }
  });

  app.get("/api/universities/:id/resources", async (req: Request, res: Response) => {
    try {
      const resources = await storage.getUniversityResources(req.params.id);
      res.json(resources);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  app.get("/api/ideas", async (req: Request, res: Response) => {
    try {
      const ideas = await storage.getIdeas(req.session.userId);
      res.json(ideas);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ideas" });
    }
  });

  // Get current user's ideas - must be before /api/ideas/:id
  app.get("/api/ideas/mine", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const ideas = await storage.getUserIdeas(req.session.userId);
      res.json(ideas);
    } catch (error) {
      console.error("Fetch user ideas error:", error);
      res.status(500).json({ error: "Failed to fetch user ideas" });
    }
  });

  app.get("/api/ideas/:id", async (req: Request, res: Response) => {
    try {
      const idea = await storage.getIdea(req.params.id);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }
      const tags = await storage.getIdeaTags(req.params.id);
      res.json({ ...idea, tags: tags.map(t => t.tag) });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch idea" });
    }
  });

  app.post("/api/ideas", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const idea = await storage.createIdea({
        ...req.body,
        createdBy: req.session.userId,
      });
      
      if (req.body.tags && Array.isArray(req.body.tags)) {
        for (const tag of req.body.tags) {
          await storage.addIdeaTag(idea.id, tag);
        }
      }
      
      res.json(idea);
    } catch (error) {
      console.error("Create idea error:", error);
      res.status(500).json({ error: "Failed to create idea" });
    }
  });

  app.patch("/api/ideas/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const idea = await storage.updateIdea(req.params.id, req.body);
      res.json(idea);
    } catch (error) {
      res.status(500).json({ error: "Failed to update idea" });
    }
  });

  app.delete("/api/ideas/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.deleteIdea(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete idea" });
    }
  });

  app.get("/api/teams", async (req: Request, res: Response) => {
    try {
      const teams = await storage.getTeams(req.session.userId);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const team = await storage.createTeam({
        ...req.body,
        createdBy: req.session.userId,
      });
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const projects = await storage.getProjects(req.session.userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/workflows", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const runs = await storage.getWorkflowRuns(req.session.userId);
      res.json(runs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.get("/api/workflows/:id", async (req: Request, res: Response) => {
    try {
      const run = await storage.getWorkflowRun(req.params.id);
      if (!run) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      const artifacts = await storage.getWorkflowArtifacts(req.params.id);
      res.json({ ...run, artifacts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  });

  app.post("/api/workflows/run", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { workflowType, ideaId, inputs } = req.body;
      
      const run = await storage.createWorkflowRun({
        userId: req.session.userId,
        workflowType,
        ideaId,
        inputs: JSON.stringify(inputs || {}),
        status: "running",
      });

      res.json(run);

      // Run AI generation asynchronously
      if (workflowType === "business_plan" && inputs) {
        generateBusinessPlan({
          title: inputs.title || "",
          problem: inputs.problem || "",
          solution: inputs.solution,
          targetUser: inputs.targetUser,
          whyNow: inputs.whyNow,
        })
          .then(async (sections) => {
            await storage.createWorkflowArtifact({
              workflowRunId: run.id,
              content: JSON.stringify(sections),
            });
            await storage.updateWorkflowRun(run.id, { status: "completed" });
            
            // Update idea stage to "find_advisors" after business plan is generated
            if (ideaId) {
              await storage.updateIdea(ideaId, { stage: "find_advisors" });
              
              // Auto-populate editable workflow sections with AI-generated content
              // Keys must match the actual AI output fields from generateBusinessPlan
              const sectionMapping: Record<string, string> = {
                executiveSummary: "executive_summary",
                founderFit: "founder_fit",
                competitiveLandscape: "competitive_landscape",
                riskMoat: "risk_and_moat",
                mvpDesign: "mvp_design",
                teamTalent: "team_and_talent",
                launchPlan: "launch_plan",
                schoolAdvantage: "school_advantage",
                fundingPitch: "funding_pitch",
              };
              
              for (const [key, sectionType] of Object.entries(sectionMapping)) {
                const content = (sections as any)[key];
                if (content) {
                  await storage.upsertIdeaWorkflowSection(ideaId, sectionType, content, true);
                }
              }
            }
          })
          .catch(async (error) => {
            console.error("AI generation failed:", error);
            await storage.updateWorkflowRun(run.id, { status: "failed" });
          });
      }
    } catch (error) {
      console.error("Workflow run error:", error);
      res.status(500).json({ error: "Failed to start workflow" });
    }
  });

  app.get("/api/notifications", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notifications = await storage.getNotifications(req.session.userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  // Dashboard endpoints
  app.get("/api/join-requests", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const requests = await storage.getJoinRequestsForUserIdeas(req.session.userId);
      res.json(requests);
    } catch (error) {
      console.error("Fetch join requests error:", error);
      res.status(500).json({ error: "Failed to fetch join requests" });
    }
  });

  app.post("/api/join-requests", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { ideaId, message } = req.body;
      const request = await storage.createJoinRequest({
        userId: req.session.userId,
        ideaId,
        message,
        status: "pending"
      });
      res.json(request);
    } catch (error) {
      console.error("Create join request error:", error);
      res.status(500).json({ error: "Failed to create join request" });
    }
  });

  app.patch("/api/join-requests/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { status } = req.body;
      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const updated = await storage.updateJoinRequest(req.params.id, { status });
      res.json(updated);
    } catch (error) {
      console.error("Update join request error:", error);
      res.status(500).json({ error: "Failed to update join request" });
    }
  });

  app.get("/api/profiles/potential-team", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const ideaId = req.query.ideaId as string | undefined;
      const profiles = await storage.getPotentialTeamMembers(req.session.userId, ideaId);
      res.json(profiles);
    } catch (error) {
      console.error("Fetch potential team members error:", error);
      res.status(500).json({ error: "Failed to fetch potential team members" });
    }
  });

  app.post("/api/team-invites", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { ideaId, inviteeId, message } = req.body;
      const invite = await storage.createTeamInvite({
        ideaId,
        inviterId: req.session.userId,
        inviteeId,
        message,
        status: "pending"
      });
      res.json(invite);
    } catch (error) {
      console.error("Create team invite error:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  // Editable Workflow Sections for Ideas
  app.post("/api/ideas/:id/workflows/populate", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const ideaId = req.params.id;
      
      // Verify user owns the idea
      const idea = await storage.getIdea(ideaId);
      if (!idea || idea.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to edit this idea" });
      }

      // Find the business plan for this idea
      const workflows = await storage.getWorkflowRuns(req.session.userId);
      const planWorkflow = workflows.find(
        (w) => w.ideaId === ideaId && w.workflowType === "business_plan" && w.status === "completed"
      );

      if (!planWorkflow) {
        return res.status(404).json({ error: "No completed business plan found for this idea" });
      }

      // Get the artifacts
      const artifacts = await storage.getWorkflowArtifacts(planWorkflow.id);
      if (!artifacts || artifacts.length === 0) {
        return res.status(404).json({ error: "No business plan content found" });
      }

      const artifactContent = artifacts[0].content;
      if (!artifactContent) {
        return res.status(404).json({ error: "No business plan content found" });
      }
      const sections = JSON.parse(artifactContent);

      // Section mapping from business plan keys to workflow section types
      const sectionMapping: Record<string, string> = {
        executiveSummary: "executive_summary",
        founderFit: "founder_fit",
        competitiveLandscape: "competitive_landscape",
        riskMoat: "risk_and_moat",
        mvpDesign: "mvp_design",
        teamTalent: "team_and_talent",
        launchPlan: "launch_plan",
        schoolAdvantage: "school_advantage",
        fundingPitch: "funding_pitch",
      };

      // Populate workflow sections
      for (const [planKey, sectionType] of Object.entries(sectionMapping)) {
        const content = sections[planKey];
        if (content) {
          await storage.upsertIdeaWorkflowSection(ideaId, sectionType, content, true);
        }
      }

      res.json({ success: true, message: "Workflow sections populated from business plan" });
    } catch (error) {
      console.error("Populate workflow sections error:", error);
      res.status(500).json({ error: "Failed to populate workflow sections" });
    }
  });

  app.get("/api/ideas/:id/workflows", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const sections = await storage.getIdeaWorkflowSections(req.params.id);
      res.json(sections);
    } catch (error) {
      console.error("Fetch workflow sections error:", error);
      res.status(500).json({ error: "Failed to fetch workflow sections" });
    }
  });

  app.get("/api/ideas/:id/workflows/:sectionType", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const section = await storage.getIdeaWorkflowSection(req.params.id, req.params.sectionType);
      res.json(section || null);
    } catch (error) {
      console.error("Fetch workflow section error:", error);
      res.status(500).json({ error: "Failed to fetch workflow section" });
    }
  });

  app.patch("/api/ideas/:id/workflows/:sectionType", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Verify user owns the idea
      const idea = await storage.getIdea(req.params.id);
      if (!idea || idea.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to edit this idea" });
      }

      const { content } = req.body;
      const section = await storage.upsertIdeaWorkflowSection(
        req.params.id,
        req.params.sectionType,
        content,
        false // aiGenerated = false since user is editing
      );
      res.json(section);
    } catch (error) {
      console.error("Update workflow section error:", error);
      res.status(500).json({ error: "Failed to update workflow section" });
    }
  });

  // ============ Admin Routes ============

  // Check if current user is admin
  app.get("/api/admin/check", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    res.json({ isAdmin });
  });

  // Get all profiles with badges (admin only)
  app.get("/api/admin/profiles", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const profiles = await storage.getProfilesWithBadges();
      res.json(profiles);
    } catch (error) {
      console.error("Fetch profiles error:", error);
      res.status(500).json({ error: "Failed to fetch profiles" });
    }
  });

  // Award badge (admin only)
  app.post("/api/admin/badges", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const { userId, badgeType } = req.body;
      if (!userId || !badgeType || !["ambassador", "advisor"].includes(badgeType)) {
        return res.status(400).json({ error: "Invalid userId or badgeType" });
      }
      
      const badge = await storage.awardBadge(userId, badgeType, req.session.userId);
      res.json(badge);
    } catch (error) {
      console.error("Award badge error:", error);
      res.status(500).json({ error: "Failed to award badge" });
    }
  });

  // Revoke badge (admin only)
  app.delete("/api/admin/badges/:userId/:badgeType", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const userId = parseInt(req.params.userId);
      const badgeType = req.params.badgeType as "ambassador" | "advisor";
      
      if (!["ambassador", "advisor"].includes(badgeType)) {
        return res.status(400).json({ error: "Invalid badgeType" });
      }
      
      await storage.revokeBadge(userId, badgeType);
      res.json({ success: true });
    } catch (error) {
      console.error("Revoke badge error:", error);
      res.status(500).json({ error: "Failed to revoke badge" });
    }
  });

  // Get user's badges (for profile display)
  app.get("/api/profile/badges", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const badges = await storage.getUserBadges(req.session.userId);
      res.json(badges);
    } catch (error) {
      console.error("Fetch badges error:", error);
      res.status(500).json({ error: "Failed to fetch badges" });
    }
  });
}
