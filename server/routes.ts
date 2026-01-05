import express, { Request, Response, Express } from "express";
import { storage } from "./storage";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generateBusinessPlan } from "./ai";
import { analyzeRawIdea, type RawIdeaInput } from "./ai-wizard";
import { generateSmartMatches, type MatchingNeeds } from "./smart-matching";
import { trackReferral, getUserReferrals, getUserReferralStats, getAllReferrals, initReferralsTable } from "./referrals";
import { getPipelineStats, getPipelineIdeas } from "./pipeline";
import ideaInterestsRouter from "./idea-interests";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";

const objectStorageService = new ObjectStorageService();

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
  // Initialize referrals table
  initReferralsTable().catch(console.error);

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Register idea interests routes
  app.use(ideaInterestsRouter);

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
      // Explicitly save session before responding
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Failed to save session' });
        }
        res.json({ user: { id: user.id, email: user.email, fullName: user.fullName } });
      });
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
      // Explicitly save session before responding
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Failed to save session' });
        }
        res.json({ user: { id: user.id, email: user.email, fullName: user.fullName } });
      });
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
    console.log('Auth check - Session ID:', req.sessionID, 'User ID:', req.session.userId);
    if (!req.session.userId) {
      console.log('No userId in session, returning 401');
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Optimized: Single query instead of 3 separate queries
      const result = await pool.query(`
        SELECT 
          u.id, u.email, u.full_name as "fullName",
          p.university_id as "universityId", p.major, p.graduation_year as "graduationYear", p.linkedin_url as "linkedinUrl", p.bio, p.skills, p.avatar_url as "avatarUrl",
          p.headline, p.looking_for as "lookingFor", p.portfolio_url as "portfolioUrl", p.github_url as "githubUrl", p.reputation_score as "reputationScore"
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = $1
      `, [req.session.userId]);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "User not found" });
      }

      const row = result.rows[0];
      
      // Fetch user roles from user_roles table
      const rolesResult = await pool.query(`
        SELECT role FROM user_roles WHERE user_id = $1
      `, [req.session.userId]);
      const roles = rolesResult.rows.map(r => r.role);
      
      res.json({
        user: { id: row.id, email: row.email, fullName: row.fullName },
        profile: {
          universityId: row.universityId,
          major: row.major,
          graduationYear: row.graduationYear,
          linkedinUrl: row.linkedinUrl,
          bio: row.bio,
          skills: row.skills,
          avatarUrl: row.avatarUrl,
          headline: row.headline,
          lookingFor: row.lookingFor,
          portfolioUrl: row.portfolioUrl,
          githubUrl: row.githubUrl,
          reputationScore: row.reputationScore,
        },
        roles: roles,
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

  // Upload avatar directly using multer
  app.post("/api/profile/avatar/upload", avatarUpload.single("avatar"), async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Convert image to base64 data URL for database storage
      // This persists across Railway deployments (ephemeral filesystem issue)
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString('base64');
      const avatarUrl = `data:${req.file.mimetype};base64,${base64Image}`;
      
      // Clean up temporary file
      fs.unlinkSync(req.file.path);
      
      // Update profile with base64 avatar URL
      await storage.updateProfile(req.session.userId, { avatarUrl });

      res.json({ avatarUrl });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

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

  // Collaborators marketplace - all users with filters
  app.get("/api/collaborators", async (req: Request, res: Response) => {
    try {
      const roles = req.query.roles ? (Array.isArray(req.query.roles) ? req.query.roles : [req.query.roles]) as string[] : undefined;
      const skills = req.query.skills ? (Array.isArray(req.query.skills) ? req.query.skills : [req.query.skills]) as string[] : undefined;
      const interests = req.query.interests ? (Array.isArray(req.query.interests) ? req.query.interests : [req.query.interests]) as string[] : undefined;
      const clubType = req.query.clubType as string | undefined;
      const search = req.query.search as string | undefined;
      
      const collaborators = await storage.getCollaborators({
        roles,
        skills,
        interests,
        clubType,
        search,
      });
      res.json(collaborators);
    } catch (error) {
      console.error("Fetch collaborators error:", error);
      res.status(500).json({ error: "Failed to fetch collaborators" });
    }
  });

  // Public profile view - get another user's profile info
  app.get("/api/users/:userId", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const publicProfile = await storage.getPublicProfile(userId);
      if (!publicProfile) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(publicProfile);
    } catch (error) {
      console.error("Fetch public profile error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
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
      // Marketplace: only show public ideas (don't pass userId)
      const ideas = await storage.getIdeas();
      res.json(ideas);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ideas" });
    }
  });

  // Get current user's ideas
  app.get("/api/my-ideas", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      console.log(`[my-ideas] Fetching ideas for user ${req.session.userId}`);
      const ideas = await storage.getIdeas(req.session.userId);
      console.log(`[my-ideas] Found ${ideas.length} total ideas`);
      
      // Filter to only show ideas created by the current user
      const myIdeas = ideas.filter(idea => idea.createdBy === req.session.userId);
      console.log(`[my-ideas] Filtered to ${myIdeas.length} user's ideas`);
      
      res.json(myIdeas);
    } catch (error) {
      console.error("Error fetching user's ideas:", error);
      res.status(500).json({ error: "Failed to fetch ideas" });
    }
  });

  // Get all referrals (admin only)
  app.get("/api/referrals/all", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const referrals = await getAllReferrals();
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching all referrals:", error);
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  // Pipeline routes (admin only)
  app.get("/api/admin/pipeline/stats", getPipelineStats);
  app.get("/api/admin/pipeline/ideas", getPipelineIdeas);

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

  // AI Idea Wizard endpoints
  app.post("/api/ideas/ai-refine", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const input: RawIdeaInput = {
        rawIdea: req.body.rawIdea,
        clarifications: req.body.clarifications,
      };

      if (!input.rawIdea || input.rawIdea.trim().length < 20) {
        return res.status(400).json({ 
          error: "Please provide a more detailed description of your idea (at least 20 characters)" 
        });
      }

      const result = await analyzeRawIdea(input);
      res.json(result);
    } catch (error: any) {
      console.error("AI refine error:", error?.message || error);
      res.status(500).json({ 
        error: error?.message || "Failed to refine idea. Please try again."
      });
    }
  });

  // Smart Matching endpoint
  app.post("/api/ideas/:id/smart-match", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const idea = await storage.getIdea(req.params.id);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      // Check if user owns this idea
      if (idea.creator_id !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Get all users for matching
      const allUsers = await storage.getAllUsersForMatching();
      
      // Prepare matching needs
      const needs: MatchingNeeds = {
        ideaTitle: idea.title,
        ideaProblem: idea.problem,
        ideaSolution: idea.solution,
        targetUser: idea.target_user || '',
        stage: idea.stage || 'idea',
        rolesNeeded: [],
      };

      // Generate matches
      const matches = await generateSmartMatches(needs, allUsers);

      return res.json(matches);
    } catch (error) {
      console.error('Smart matching error:', error);
      return res.status(500).json({ 
        error: 'Failed to generate matches',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/ideas", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const ideaData = {
        title: req.body.title,
        problem: req.body.problem,
        solution: req.body.solution || null,
        targetUser: req.body.targetUser || null,
        whyNow: req.body.whyNow || null,
        assumptions: req.body.assumptions || null,
        desiredTeammates: req.body.desiredTeammates || null,
        expectedTimeline: req.body.expectedTimeline || null,
        stage: "idea_posted" as const,
        isPublic: req.body.isPublic !== false,
        createdBy: req.session.userId,
      };
      
      const idea = await storage.createIdea(ideaData);
      
      if (req.body.tags && Array.isArray(req.body.tags)) {
        for (const tag of req.body.tags) {
          await storage.addIdeaTag(idea.id, tag);
        }
      }
      
      res.json(idea);
    } catch (error: any) {
      console.error("Create idea error:", error?.message || error);
      res.status(500).json({ error: "Failed to create idea", details: error?.message });
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

  // Toggle idea visibility (public/private)
  app.patch("/api/ideas/:id/visibility", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const idea = await storage.getIdea(req.params.id);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      // Verify user owns the idea
      if (idea.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to modify this idea" });
      }

      const { isPublic } = req.body;
      const updatedIdea = await storage.updateIdea(req.params.id, { isPublic });
      res.json(updatedIdea);
    } catch (error) {
      console.error("Toggle visibility error:", error);
      res.status(500).json({ error: "Failed to update idea visibility" });
    }
  });

  app.delete("/api/ideas/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Check if user is admin or owns the idea
      const idea = await storage.getIdea(req.params.id);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      const userRoles = await storage.getUserRoles(req.session.userId);
      const isAdmin = userRoles.some(r => r.role === 'admin');
      const isOwner = idea.createdBy === req.session.userId;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Not authorized to delete this idea" });
      }

      await storage.deleteIdea(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete idea error:", error);
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
          .catch(async (error: any) => {
            console.error("AI generation failed:");
            console.error("Error message:", error?.message || "No message");
            console.error("Error name:", error?.name || "No name");
            console.error("Error status:", error?.status || "No status");
            console.error("Error code:", error?.code || "No code");
            if (error?.response) {
              console.error("Response status:", error.response.status);
              console.error("Response data:", JSON.stringify(error.response.data));
            }
            console.error("Stack:", error?.stack || "No stack");
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

  // Get all ideas (admin only - includes private ideas)
  app.get("/api/admin/ideas", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const ideas = await storage.getAllIdeasAdmin();
      res.json(ideas);
    } catch (error) {
      console.error("Admin get ideas error:", error);
      res.status(500).json({ error: "Failed to fetch ideas" });
    }
  });

  // Get all admins (admin only)
  app.get("/api/admin/admins", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const admins = await storage.getAdmins();
      res.json(admins);
    } catch (error) {
      console.error("Get admins error:", error);
      res.status(500).json({ error: "Failed to fetch admins" });
    }
  });

  // Grant admin role (admin only)
  app.post("/api/admin/admins", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      
      await storage.grantAdminRole(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Grant admin error:", error);
      res.status(500).json({ error: "Failed to grant admin role" });
    }
  });

  // Revoke admin role (admin only)
  app.delete("/api/admin/admins/:userId", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const userId = parseInt(req.params.userId);
      
      // Prevent removing yourself as admin
      if (userId === req.session.userId) {
        return res.status(400).json({ error: "Cannot remove your own admin access" });
      }
      
      await storage.revokeAdminRole(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Revoke admin error:", error);
      res.status(500).json({ error: "Failed to revoke admin role" });
    }
  });

  // ===============================================
  // Connection System (LinkedIn/Facebook style)
  // ===============================================

  // Send a connection request
  app.post("/api/connections", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { recipientId, message } = req.body;
      
      if (!recipientId) {
        return res.status(400).json({ error: "recipientId is required" });
      }

      if (recipientId === req.session.userId) {
        return res.status(400).json({ error: "Cannot connect with yourself" });
      }

      const connection = await storage.sendConnectionRequest(req.session.userId, recipientId, message);
      res.json(connection);
    } catch (error: any) {
      console.error("Send connection error:", error);
      if (error.message === 'Connection already exists') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to send connection request" });
    }
  });

  // Get connection status with another user
  app.get("/api/connections/status/:userId", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const otherUserId = parseInt(req.params.userId);
      const status = await storage.getConnectionStatus(req.session.userId, otherUserId);
      res.json(status || { status: 'none' });
    } catch (error) {
      console.error("Get connection status error:", error);
      res.status(500).json({ error: "Failed to get connection status" });
    }
  });

  // Get pending connection requests (received or sent)
  app.get("/api/connections/pending", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const direction = (req.query.direction as 'received' | 'sent') || 'received';
      const requests = await storage.getPendingConnectionRequests(req.session.userId, direction);
      res.json(requests);
    } catch (error) {
      console.error("Get pending connections error:", error);
      res.status(500).json({ error: "Failed to get pending connections" });
    }
  });

  // Get all accepted connections
  app.get("/api/connections", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const connections = await storage.getConnections(req.session.userId);
      res.json(connections);
    } catch (error) {
      console.error("Get connections error:", error);
      res.status(500).json({ error: "Failed to get connections" });
    }
  });

  // Accept a connection request
  app.post("/api/connections/:id/accept", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const connection = await storage.acceptConnection(req.params.id, req.session.userId);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found or cannot accept" });
      }
      res.json(connection);
    } catch (error) {
      console.error("Accept connection error:", error);
      res.status(500).json({ error: "Failed to accept connection" });
    }
  });

  // Reject a connection request
  app.post("/api/connections/:id/reject", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const connection = await storage.rejectConnection(req.params.id, req.session.userId);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found or cannot reject" });
      }
      res.json(connection);
    } catch (error) {
      console.error("Reject connection error:", error);
      res.status(500).json({ error: "Failed to reject connection" });
    }
  });

  // Cancel a pending connection request (sender only)
  app.delete("/api/connections/:id/cancel", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.cancelConnection(req.params.id, req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Cancel connection error:", error);
      res.status(500).json({ error: "Failed to cancel connection" });
    }
  });

  // Remove an accepted connection (either party)
  app.delete("/api/connections/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      await storage.removeConnection(req.params.id, req.session.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove connection error:", error);
      res.status(500).json({ error: "Failed to remove connection" });
    }
  });

  // ===== REFERRAL TRACKING ENDPOINTS =====

  // Track a new referral click
  app.post("/api/referrals/track", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { platform, ideaId, ideaTitle } = req.body;
      const referral = await trackReferral(
        req.session.userId,
        platform,
        ideaId,
        ideaTitle
      );
      res.json(referral);
    } catch (error) {
      console.error("Track referral error:", error);
      res.status(500).json({ error: "Failed to track referral" });
    }
  });

  // Get all referrals (admin only)
  app.get("/api/referrals/mine", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const referrals = await getAllReferrals();
      res.json(referrals);
    } catch (error) {
      console.error("Get referrals error:", error);
      res.status(500).json({ error: "Failed to get referrals" });
    }
  });

  // Get all referral stats (admin only)
  app.get("/api/referrals/stats", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get stats for all users combined
      const allReferrals = await getAllReferrals();
      const totalClicks = allReferrals.length;
      const totalConversions = allReferrals.filter(r => r.status === 'converted').length;
      const estimatedRevenue = allReferrals
        .filter(r => r.status === 'converted')
        .reduce((sum, r) => sum + (r.estimatedRevenue || 0), 0);
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      // Platform breakdown
      const platformMap = new Map<string, { clicks: number; conversions: number }>();
      allReferrals.forEach(r => {
        const current = platformMap.get(r.platform) || { clicks: 0, conversions: 0 };
        current.clicks++;
        if (r.status === 'converted') current.conversions++;
        platformMap.set(r.platform, current);
      });

      const platformBreakdown = Array.from(platformMap.entries()).map(([platform, data]) => ({
        platform,
        clicks: data.clicks,
        conversions: data.conversions
      }));

      const stats = {
        totalClicks,
        totalConversions,
        estimatedRevenue,
        conversionRate,
        platformBreakdown
      };

      res.json(stats);
    } catch (error) {
      console.error("Get referral stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // Get all referrals (admin only)
  app.get("/api/referrals/all", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const referrals = await getAllReferrals();
      res.json(referrals);
    } catch (error) {
      console.error("Get all referrals error:", error);
      res.status(500).json({ error: "Failed to get referrals" });
    }
  });

  // ===== ADMIN MANAGEMENT ENDPOINTS =====

  // Get all users (admin only)
  app.get("/api/admin/users", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userRoles = await storage.getUserRoles(req.session.userId);
      const isAdmin = userRoles.some(r => r.role === 'admin');
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userRoles = await storage.getUserRoles(req.session.userId);
      const isAdmin = userRoles.some(r => r.role === 'admin');
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Don't allow deleting yourself
      if (userId === req.session.userId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Delete team member (admin only)
  app.delete("/api/admin/team-members/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userRoles = await storage.getUserRoles(req.session.userId);
      const isAdmin = userRoles.some(r => r.role === 'admin');
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteTeamMember(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete team member error:", error);
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // Get all team members (admin only)
  app.get("/api/admin/team-members", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userRoles = await storage.getUserRoles(req.session.userId);
      const isAdmin = userRoles.some(r => r.role === 'admin');
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const teamMembers = await storage.getAllTeamMembers();
      res.json(teamMembers);
    } catch (error) {
      console.error("Get all team members error:", error);
      res.status(500).json({ error: "Failed to get team members" });
    }
  });

  // Get all ideas (admin only)
  app.get("/api/admin/ideas", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userRoles = await storage.getUserRoles(req.session.userId);
      const isAdmin = userRoles.some(r => r.role === 'admin');
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const ideas = await storage.getAllIdeas();
      res.json(ideas);
    } catch (error) {
      console.error("Get all ideas error:", error);
      res.status(500).json({ error: "Failed to get ideas" });
    }
  });
}
