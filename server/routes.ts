import express, { Request, Response, Express } from "express";
import { storage } from "./storage";
import { pool, db } from "./db";
import * as schema from "../shared/schema";
import { eq, sql, desc, or, and } from "drizzle-orm";
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

      // Send welcome email (don't wait for it to avoid blocking)
      const { sendWelcomeEmail } = await import('./email');
      sendWelcomeEmail(user.email, fullName || 'there').catch(err => {
        console.error('Failed to send welcome email:', err);
      });

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
      
      if (user) {
        // Generate reset token and send email
        const resetToken = await storage.createPasswordResetToken(user.id);
        const { sendPasswordResetEmail } = await import('./email');
        await sendPasswordResetEmail(user.email, resetToken);
        console.log(`Password reset email sent to: ${user.email}`);
      }

      // Always return success to prevent email enumeration attacks
      res.json({ success: true, message: "If an account exists, a reset email will be sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  app.get("/api/auth/verify-reset-token/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      const user = await storage.validateResetToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ error: "Failed to verify token" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const success = await storage.resetPassword(token, newPassword);
      
      if (!success) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      res.json({ success: true, message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
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
          p.university_id as "universityId", p.other_university as "otherUniversity", p.major, p.graduation_year as "graduationYear", 
          p.linkedin_url as "linkedinUrl", p.bio, p.skills, p.interests, p.availability, p.avatar_url as "avatarUrl",
          p.headline, p.looking_for as "lookingFor", p.portfolio_url as "portfolioUrl", p.github_url as "githubUrl", 
          p.reputation_score as "reputationScore", p.club_type as "clubType", p.onboarding_completed as "onboardingCompleted"
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
          fullName: row.fullName,
          universityId: row.universityId,
          otherUniversity: row.otherUniversity,
          major: row.major,
          graduationYear: row.graduationYear,
          linkedinUrl: row.linkedinUrl,
          bio: row.bio,
          skills: row.skills,
          interests: row.interests,
          availability: row.availability,
          avatarUrl: row.avatarUrl,
          headline: row.headline,
          lookingFor: row.lookingFor,
          portfolioUrl: row.portfolioUrl,
          githubUrl: row.githubUrl,
          reputationScore: row.reputationScore,
          clubType: row.clubType,
          onboardingCompleted: row.onboardingCompleted,
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
      console.log('[profile-update] Received data:', JSON.stringify(data, null, 2));
      
      // Validate yassuRole if provided
      if (data.yassuRole !== undefined) {
        const validRoles = ['ambassador', 'advisor', null];
        if (!validRoles.includes(data.yassuRole)) {
          return res.status(400).json({ error: "Invalid Yassu role" });
        }
      }
      
      const profile = await storage.updateProfile(req.session.userId, data);
      
      // Send skill match notifications if skills were updated
      if (data.skills && data.skills.length > 0 && profile.email) {
        // Find public ideas that match the user's skills
        const matchingIdeas = await storage.findIdeasBySkills(data.skills, req.session.userId);
        
        if (matchingIdeas.length > 0) {
          const { sendSkillMatchEmail } = await import('./email');
          
          // Send email about top 5 matching ideas
          const topMatches = matchingIdeas.slice(0, 5);
          
          for (const match of topMatches) {
            if (match.idea && match.matchingSkills && match.matchingSkills.length > 0) {
              sendSkillMatchEmail(
                profile.email,
                profile.fullName || 'there',
                match.idea.title,
                match.idea.problem || 'No description provided',
                match.idea.id,
                match.matchingSkills
              ).catch(err => {
                console.error('Failed to send skill match email:', err);
              });
            }
          }
        }
      }
      
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
      const ideas = await storage.getIdeasWithCreators();
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
      if (idea.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Get all users for matching
      const allUsers = await storage.getAllUsersForMatching();
      
      // Prepare matching needs
      const needs: MatchingNeeds = {
        ideaTitle: idea.title,
        ideaProblem: idea.problem,
        ideaSolution: idea.solution || '',
        targetUser: idea.targetUser || '',
        stage: idea.stage || 'idea_posted',
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
      
      // Auto-create a team for this idea
      await storage.createTeam({
        name: `${idea.title} Team`,
        description: `Team for ${idea.title}`,
        ideaId: idea.id,
        createdBy: req.session.userId,
      });
      
      if (req.body.tags && Array.isArray(req.body.tags)) {
        for (const tag of req.body.tags) {
          await storage.addIdeaTag(idea.id, tag);
        }
      }
      
      // Send skill match notifications if idea is public
      if (ideaData.isPublic && req.body.desiredTeammates) {
        // Extract skills from desiredTeammates text
        const desiredSkills = req.body.desiredTeammates
          .toLowerCase()
          .split(/[,;\n]+/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
        
        if (desiredSkills.length > 0) {
          // Find users with matching skills
          const matchingProfiles = await storage.findProfilesBySkills(desiredSkills, req.session.userId);
          
          // Send emails to top matches (limit to 10 to avoid spam)
          const { sendSkillMatchEmail } = await import('./email');
          const topMatches = matchingProfiles.slice(0, 10);
          
          for (const profile of topMatches) {
            if (profile.email && profile.matchingSkills && profile.matchingSkills.length > 0) {
              sendSkillMatchEmail(
                profile.email,
                profile.fullName || 'there',
                idea.title,
                idea.problem || 'No description provided',
                idea.id,
                profile.matchingSkills
              ).catch(err => {
                console.error('Failed to send skill match email:', err);
              });
            }
          }
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

  // Save MVP link for an idea
  app.patch("/api/ideas/:id/mvp-link", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const idea = await storage.getIdea(req.params.id);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      if (idea.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to modify this idea" });
      }

      const { mvpLink } = req.body;
      const updatedIdea = await storage.updateIdea(req.params.id, { mvpLink });
      res.json(updatedIdea);
    } catch (error) {
      console.error("Save MVP link error:", error);
      res.status(500).json({ error: "Failed to save MVP link" });
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

  app.get("/api/teams/by-idea/:ideaId", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const { ideaId } = req.params;
      const team = await db.select()
        .from(schema.teams)
        .where(eq(schema.teams.ideaId, ideaId))
        .limit(1);
      
      if (team.length === 0) {
        return res.json({ team: null });
      }
      
      res.json({ team: team[0] });
    } catch (error) {
      console.error("Failed to fetch team by idea:", error);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  app.get("/api/teams/my", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const teams = await storage.getUserTeams(req.session.userId);
      
      // Get member counts for each team
      const teamsWithCounts = await Promise.all(teams.map(async (team) => {
        const members = await db.select()
          .from(schema.teamMembers)
          .where(eq(schema.teamMembers.teamId, team.id));
        
        return {
          ...team,
          memberCount: members.length + 1, // +1 for creator
        };
      }));
      
      res.json(teamsWithCounts);
    } catch (error) {
      console.error("Failed to fetch user teams:", error);
      res.status(500).json({ error: "Failed to fetch your teams" });
    }
  });

  app.get("/api/teams/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const teamId = req.params.id;
      const userId = req.session.userId;
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      // Check if user is authorized to view this team (creator, member, or admin)
      const isCreator = team.createdBy === userId;
      const isMember = await db.select()
        .from(schema.teamMembers)
        .where(sql`${schema.teamMembers.teamId} = ${teamId} AND ${schema.teamMembers.userId} = ${userId}`)
        .limit(1);
      const isAdmin = await db.select()
        .from(schema.userRoles)
        .where(sql`${schema.userRoles.userId} = ${userId} AND ${schema.userRoles.role} = 'admin'`)
        .limit(1);
      
      if (!isCreator && isMember.length === 0 && isAdmin.length === 0) {
        return res.status(403).json({ error: "You don't have access to this team" });
      }
      
      // Get team members
      const members = await db.select({
        id: schema.teamMembers.id,
        userId: schema.teamMembers.userId,
        role: schema.teamMembers.role,
        joinedAt: schema.teamMembers.joinedAt,
        fullName: schema.profiles.fullName,
        avatarUrl: schema.profiles.avatarUrl,
        headline: schema.profiles.headline,
      })
        .from(schema.teamMembers)
        .leftJoin(schema.profiles, eq(schema.teamMembers.userId, schema.profiles.userId))
        .where(eq(schema.teamMembers.teamId, teamId));
      
      // Get creator info
      const creator = await db.select({
        fullName: schema.profiles.fullName,
        avatarUrl: schema.profiles.avatarUrl,
        headline: schema.profiles.headline,
      })
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, team.createdBy))
        .limit(1);
      
      // Get linked idea title
      let ideaTitle = null;
      if (team.ideaId) {
        const idea = await storage.getIdea(team.ideaId);
        ideaTitle = idea?.title;
      }
      
      // Get existing member user IDs
      const existingMemberIds = new Set([team.createdBy, ...members.map(m => m.userId)]);
      
      // Get recommended advisors (profiles with advisor badges, not already team members)
      let recommendedAdvisors: any[] = [];
      const advisorBadges = await db.select({
        userId: schema.profileBadges.userId,
        fullName: schema.profiles.fullName,
        avatarUrl: schema.profiles.avatarUrl,
        headline: schema.profiles.headline,
        skills: schema.profiles.skills,
      })
        .from(schema.profileBadges)
        .leftJoin(schema.profiles, eq(schema.profileBadges.userId, schema.profiles.userId))
        .where(eq(schema.profileBadges.badgeType, 'advisor'))
        .limit(10);
      
      recommendedAdvisors = advisorBadges
        .filter(a => !existingMemberIds.has(a.userId))
        .slice(0, 5);
      
      // Get recommended collaborators (other users with relevant skills, not already team members)
      let recommendedCollaborators: any[] = [];
      const allProfiles = await db.select({
        userId: schema.profiles.userId,
        fullName: schema.profiles.fullName,
        avatarUrl: schema.profiles.avatarUrl,
        headline: schema.profiles.headline,
        skills: schema.profiles.skills,
      })
        .from(schema.profiles)
        .limit(20);
      
      recommendedCollaborators = allProfiles
        .filter(p => !existingMemberIds.has(p.userId))
        .slice(0, 5);
      
      // Get join requests for this team's idea
      let joinRequests: any[] = [];
      if (team.ideaId && isCreator) {
        const requests = await db.select({
          id: schema.joinRequests.id,
          userId: schema.joinRequests.userId,
          message: schema.joinRequests.message,
          role: schema.joinRequests.role,
          motivation: schema.joinRequests.motivation,
          experience: schema.joinRequests.experience,
          status: schema.joinRequests.status,
          createdAt: schema.joinRequests.createdAt,
          fullName: schema.profiles.fullName,
          avatarUrl: schema.profiles.avatarUrl,
          headline: schema.profiles.headline,
        })
          .from(schema.joinRequests)
          .leftJoin(schema.profiles, eq(schema.joinRequests.userId, schema.profiles.userId))
          .where(
            and(
              eq(schema.joinRequests.ideaId, team.ideaId),
              eq(schema.joinRequests.status, 'pending')
            )
          )
          .orderBy(desc(schema.joinRequests.createdAt));
        
        joinRequests = requests;
      }
      
      res.json({
        team: {
          ...team,
          creatorName: creator[0]?.fullName,
          creatorAvatar: creator[0]?.avatarUrl,
          creatorHeadline: creator[0]?.headline,
          ideaTitle,
        },
        members,
        recommendedAdvisors,
        recommendedCollaborators,
        joinRequests,
      });
    } catch (error) {
      console.error("Failed to fetch team:", error);
      res.status(500).json({ error: "Failed to fetch team details" });
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
                  
                  // Extract skills from team_and_talent section (logged for future use)
                  if (sectionType === "team_and_talent") {
                    const skillsMatch = content.match(/<!-- SKILLS_JSON_START -->\s*([\s\S]*?)\s*<!-- SKILLS_JSON_END -->/);
                    if (skillsMatch && skillsMatch[1]) {
                      const skillsList = skillsMatch[1].split(',').map((s: string) => s.trim()).filter(Boolean);
                      if (skillsList.length > 0) {
                        console.log(`[AI] Extracted skills for idea ${ideaId}:`, skillsList);
                        // Skills are extracted and logged for potential future use
                      }
                    }
                  }
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
      
      // Send acceptance email if accepted
      if (status === 'accepted' && updated) {
        const [accepter, idea, ideaCreator] = await Promise.all([
          storage.getProfile(updated.userId),
          storage.getIdea(updated.ideaId),
          storage.getIdea(updated.ideaId).then(i => i ? storage.getProfile(i.createdBy) : null)
        ]);
        
        if (accepter && idea && ideaCreator && ideaCreator.email) {
          const { sendRequestAcceptedEmail } = await import('./email');
          sendRequestAcceptedEmail(
            ideaCreator.email,
            ideaCreator.fullName || 'there',
            accepter.fullName || 'Someone',
            idea.title,
            updated.ideaId
          ).catch(err => {
            console.error('Failed to send request accepted email:', err);
          });
        }
      }
      
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
      const { ideaId, inviteeId, message, role } = req.body;
      
      // Validate required fields
      if (!ideaId || !inviteeId) {
        console.error("Missing required fields:", { ideaId, inviteeId });
        return res.status(400).json({ error: "Missing required fields: ideaId and inviteeId are required" });
      }
      
      console.log("Creating team invite:", { ideaId, inviterId: req.session.userId, inviteeId, role });
      
      const invite = await storage.createTeamInvite({
        ideaId,
        inviterId: req.session.userId,
        inviteeId,
        message,
        status: "pending"
      });
      
      console.log("Team invite created successfully:", invite.id);
      
      // Send invitation email
      const [inviter, invitee, idea] = await Promise.all([
        storage.getProfile(req.session.userId),
        storage.getProfile(inviteeId),
        storage.getIdea(ideaId)
      ]);
      
      if (inviter && invitee && idea && invitee.email) {
        const { sendTeamInvitationEmail } = await import('./email');
        sendTeamInvitationEmail(
          invitee.email,
          invitee.fullName || 'there',
          inviter.fullName || 'Someone',
          idea.title,
          ideaId,
          message
        ).catch(err => {
          console.error('Failed to send team invitation email:', err);
        });
        console.log("Team invitation email sent to:", invitee.email);
      } else {
        console.log("Could not send email - missing data:", { 
          hasInviter: !!inviter, 
          hasInvitee: !!invitee, 
          hasIdea: !!idea, 
          hasEmail: !!invitee?.email 
        });
      }
      
      res.json(invite);
    } catch (error) {
      console.error("Create team invite error:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  // Get team invites sent by the current user for a specific idea
  app.get("/api/team-invites/sent", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const ideaId = req.query.ideaId as string | undefined;
      
      // Build where condition based on whether ideaId is provided
      const whereCondition = ideaId 
        ? and(eq(schema.teamInvites.inviterId, req.session.userId), eq(schema.teamInvites.ideaId, ideaId))
        : eq(schema.teamInvites.inviterId, req.session.userId);
      
      const invites = await db.select({
        id: schema.teamInvites.id,
        ideaId: schema.teamInvites.ideaId,
        inviteeId: schema.teamInvites.inviteeId,
        status: schema.teamInvites.status,
        createdAt: schema.teamInvites.createdAt,
        inviteeName: schema.profiles.fullName,
      })
        .from(schema.teamInvites)
        .leftJoin(schema.profiles, eq(schema.teamInvites.inviteeId, schema.profiles.userId))
        .where(whereCondition)
        .orderBy(desc(schema.teamInvites.createdAt));
      
      res.json(invites);
    } catch (error) {
      console.error("Get sent team invites error:", error);
      res.status(500).json({ error: "Failed to fetch sent team invites" });
    }
  });

  // Get team invites received by the current user
  app.get("/api/team-invites/received", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const invites = await db.select({
        id: schema.teamInvites.id,
        ideaId: schema.teamInvites.ideaId,
        inviterId: schema.teamInvites.inviterId,
        message: schema.teamInvites.message,
        status: schema.teamInvites.status,
        createdAt: schema.teamInvites.createdAt,
        ideaTitle: schema.ideas.title,
        inviterName: schema.profiles.fullName,
        inviterAvatar: schema.profiles.avatarUrl,
      })
        .from(schema.teamInvites)
        .leftJoin(schema.ideas, eq(schema.teamInvites.ideaId, schema.ideas.id))
        .leftJoin(schema.profiles, eq(schema.teamInvites.inviterId, schema.profiles.userId))
        .where(eq(schema.teamInvites.inviteeId, req.session.userId))
        .orderBy(schema.teamInvites.createdAt);
      
      res.json(invites);
    } catch (error) {
      console.error("Get team invites error:", error);
      res.status(500).json({ error: "Failed to fetch team invites" });
    }
  });

  // Respond to a team invite (accept or decline)
  app.patch("/api/team-invites/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { status } = req.body;
      if (!["accepted", "declined"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      // Get the invite first
      const [invite] = await db.select()
        .from(schema.teamInvites)
        .where(eq(schema.teamInvites.id, req.params.id));
      
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      if (invite.inviteeId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to respond to this invite" });
      }

      // Update invite status
      await db.update(schema.teamInvites)
        .set({ status })
        .where(eq(schema.teamInvites.id, req.params.id));

      // If accepted, add user to team
      if (status === "accepted") {
        // Find or create team for this idea
        let [team] = await db.select()
          .from(schema.teams)
          .where(eq(schema.teams.ideaId, invite.ideaId));
        
        if (!team) {
          // Create team if it doesn't exist
          const idea = await storage.getIdea(invite.ideaId);
          if (idea) {
            [team] = await db.insert(schema.teams)
              .values({
                name: `${idea.title} Team`,
                description: `Team for ${idea.title}`,
                ideaId: invite.ideaId,
                createdBy: invite.inviterId,
              })
              .returning();
          }
        }

        if (team) {
          // Add user to team
          await db.insert(schema.teamMembers)
            .values({
              teamId: team.id,
              userId: req.session.userId,
              role: "member",
            })
            .onConflictDoNothing();
        }

        // Send email notification to inviter
        const [inviter, invitee, idea] = await Promise.all([
          storage.getProfile(invite.inviterId),
          storage.getProfile(req.session.userId),
          storage.getIdea(invite.ideaId)
        ]);

        if (inviter && invitee && idea && inviter.email) {
          const { sendInviteAcceptedEmail } = await import('./email');
          sendInviteAcceptedEmail(
            inviter.email,
            inviter.fullName || 'there',
            invitee.fullName || 'Someone',
            idea.title
          ).catch(err => {
            console.error('Failed to send invite accepted email:', err);
          });
        }
      }

      res.json({ success: true, status });
    } catch (error) {
      console.error("Update team invite error:", error);
      res.status(500).json({ error: "Failed to update invite" });
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

  // TEMPORARY: Admin endpoint to update profile by email (for data migration)
  app.patch("/api/admin/profile-by-email", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const { email, profileData } = req.body;
      if (!email || !profileData) {
        return res.status(400).json({ error: "Email and profileData required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update their profile
      const profile = await storage.updateProfile(user.id, profileData);
      res.json({ success: true, profile });
    } catch (error) {
      console.error("Admin profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Get user's portfolio (created ideas and collaborations)
  app.get("/api/profile/:userId/portfolio", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const portfolio = await storage.getUserPortfolio(userId);
      res.json(portfolio);
    } catch (error) {
      console.error("Fetch portfolio error:", error);
      res.status(500).json({ error: "Failed to fetch portfolio" });
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
      
      // Send connection request email
      const [sender, recipient] = await Promise.all([
        storage.getProfile(req.session.userId),
        storage.getProfile(recipientId)
      ]);
      
      if (sender && recipient && recipient.email) {
        const { sendConnectionRequestEmail } = await import('./email');
        sendConnectionRequestEmail(
          recipient.email,
          recipient.fullName || 'there',
          sender.fullName || 'Someone',
          message
        ).catch(err => {
          console.error('Failed to send connection request email:', err);
        });
      }
      
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
        .reduce((sum, r) => sum + ((r as any).estimatedRevenue || 0), 0);
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

  // Delete idea (admin only)
  app.delete("/api/admin/ideas/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userRoles = await storage.getUserRoles(req.session.userId);
      const isAdmin = userRoles.some(r => r.role === 'admin');
      
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const ideaId = req.params.id;
      if (!ideaId) {
        return res.status(400).json({ error: "Invalid idea ID" });
      }

      await storage.deleteIdea(ideaId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete idea error:", error);
      res.status(500).json({ error: "Failed to delete idea" });
    }
  });

  // ============ Weekly Digest Routes ============
  
  // Manual trigger for weekly digest (admin only)
  app.post("/api/admin/send-weekly-digest", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Calculate date range (last 7 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Get all users for digest
      const users = await storage.getUsersForDigest();
      
      // Get platform stats (same for all users)
      const platformStats = await storage.getPlatformStats();
      
      // Get new ideas for the week
      const newIdeas = await storage.getNewIdeasForWeek(startDate, endDate);

      let successCount = 0;
      let errorCount = 0;

      // Send digest to each user
      for (const user of users) {
        try {
          if (!user.profile) continue;

          // Get user activity
          const userActivity = await storage.getUserActivitySummary(
            user.id,
            startDate,
            endDate
          );

          // Get skill matches
          const skillMatches = await storage.getSkillMatchesForUser(
            user.id,
            startDate,
            endDate
          );

          // Prepare digest data
          const digestData = {
            userName: user.profile.fullName || 'there',
            weekStart: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            weekEnd: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            newIdeas: newIdeas.slice(0, 10).map(idea => ({
              id: idea.id,
              title: idea.title,
              creatorName: 'Founder', // We'd need to join with profiles for actual names
              stage: idea.stage || 'idea_posted',
              skills: (idea as any).skills || [],
            })),
            skillMatches: skillMatches.map(match => ({
              id: match.idea.id,
              title: match.idea.title,
              creatorName: 'Founder',
              matchingSkills: match.matchingSkills,
            })),
            userActivity,
            platformStats,
          };

          // Send email
          const { sendWeeklyDigestEmail } = await import('./email');
          await sendWeeklyDigestEmail(user.email, digestData);

          // Log digest sent
          await storage.logDigestEmailSent(
            user.id,
            startDate,
            endDate,
            newIdeas.length,
            skillMatches.length
          );

          successCount++;

          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to send digest to user ${user.id}:`, error);
          errorCount++;
        }
      }

      res.json({
        success: true,
        message: `Digest sent to ${successCount} users, ${errorCount} errors`,
        stats: {
          totalUsers: users.length,
          successCount,
          errorCount,
        },
      });
    } catch (error) {
      console.error("Send weekly digest error:", error);
      res.status(500).json({ error: "Failed to send weekly digest" });
    }
  });

  // Cron endpoint for automated weekly digest
  app.get("/api/cron/weekly-digest", async (req: Request, res: Response) => {
    try {
      // Simple authentication with a secret token
      const cronSecret = process.env.CRON_SECRET || 'change-me-in-production';
      const providedSecret = req.headers['x-cron-secret'];

      if (providedSecret !== cronSecret) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Calculate date range (last 7 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Get all users for digest
      const users = await storage.getUsersForDigest();
      
      // Get platform stats
      const platformStats = await storage.getPlatformStats();
      
      // Get new ideas
      const newIdeas = await storage.getNewIdeasForWeek(startDate, endDate);

      let successCount = 0;
      let errorCount = 0;

      // Send digest to each user
      for (const user of users) {
        try {
          if (!user.profile) continue;

          const userActivity = await storage.getUserActivitySummary(
            user.id,
            startDate,
            endDate
          );

          const skillMatches = await storage.getSkillMatchesForUser(
            user.id,
            startDate,
            endDate
          );

          const digestData = {
            userName: user.profile.fullName || 'there',
            weekStart: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            weekEnd: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            newIdeas: newIdeas.slice(0, 10).map(idea => ({
              id: idea.id,
              title: idea.title,
              creatorName: 'Founder',
              stage: idea.stage || 'idea_posted',
              skills: (idea as any).skills || [],
            })),
            skillMatches: skillMatches.map(match => ({
              id: match.idea.id,
              title: match.idea.title,
              creatorName: 'Founder',
              matchingSkills: match.matchingSkills,
            })),
            userActivity,
            platformStats,
          };

          const { sendWeeklyDigestEmail } = await import('./email');
          await sendWeeklyDigestEmail(user.email, digestData);

          await storage.logDigestEmailSent(
            user.id,
            startDate,
            endDate,
            newIdeas.length,
            skillMatches.length
          );

          successCount++;

          // Delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to send digest to user ${user.id}:`, error);
          errorCount++;
        }
      }

      res.json({
        success: true,
        message: `Digest sent to ${successCount} users, ${errorCount} errors`,
        stats: {
          totalUsers: users.length,
          successCount,
          errorCount,
        },
      });
    } catch (error) {
      console.error("Cron weekly digest error:", error);
      res.status(500).json({ error: "Failed to send weekly digest" });
    }
  });

  // Direct Messages API
  
  // Search users for messaging (returns all users with connection status)
  app.get("/api/messages/search-users", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const userId = req.session.userId;
      const searchQuery = (req.query.q as string || '').toLowerCase().trim();
      
      console.log(`[search-users] User ${userId} searching for: "${searchQuery}"`);
      
      // Get all profiles except current user
      const profiles = await db.select()
        .from(schema.profiles)
        .where(sql`${schema.profiles.userId} != ${userId}`);
      
      console.log(`[search-users] Found ${profiles.length} profiles (excluding current user)`);
      if (profiles.length > 0) {
        console.log(`[search-users] Sample profiles:`, profiles.slice(0, 3).map(p => p.fullName));
      }
      
      // Get all connections for current user
      const connections = await db.select()
        .from(schema.connections)
        .where(
          or(
            eq(schema.connections.requesterId, userId),
            eq(schema.connections.recipientId, userId)
          )
        );
      
      // Build connection status map
      const connectionMap = new Map<number, { status: string; connectionId: string }>();
      connections.forEach(conn => {
        const otherUserId = conn.requesterId === userId ? conn.recipientId : conn.requesterId;
        connectionMap.set(otherUserId, { status: conn.status, connectionId: conn.id });
      });
      
      // Filter and map profiles
      let results = profiles
        .filter(p => {
          if (!searchQuery) return true;
          const name = (p.fullName || '').toLowerCase();
          const headline = (p.headline || '').toLowerCase();
          return name.includes(searchQuery) || headline.includes(searchQuery);
        })
        .map(p => ({
          userId: p.userId,
          fullName: p.fullName,
          avatarUrl: p.avatarUrl,
          headline: p.headline,
          connectionStatus: connectionMap.get(p.userId)?.status || 'none',
          connectionId: connectionMap.get(p.userId)?.connectionId || null,
        }))
        .slice(0, 20); // Limit results
      
      console.log(`[search-users] Returning ${results.length} results`);
      res.json(results);
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });
  
  // Get conversations (users with whom current user has exchanged messages)
  app.get("/api/messages/conversations", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const userId = req.session.userId;
      
      // Get all unique users the current user has messaged with
      const sentMessages = await db.select({
        recipientId: schema.directMessages.recipientId,
      })
        .from(schema.directMessages)
        .where(eq(schema.directMessages.senderId, userId))
        .groupBy(schema.directMessages.recipientId);
      
      const receivedMessages = await db.select({
        senderId: schema.directMessages.senderId,
      })
        .from(schema.directMessages)
        .where(eq(schema.directMessages.recipientId, userId))
        .groupBy(schema.directMessages.senderId);
      
      // Combine unique user IDs
      const userIds = new Set([
        ...sentMessages.map(m => m.recipientId),
        ...receivedMessages.map(m => m.senderId),
      ]);
      
      // Get user profiles and last message for each conversation
      const conversations = await Promise.all(
        Array.from(userIds).map(async (partnerId) => {
          const profile = await db.select()
            .from(schema.profiles)
            .where(eq(schema.profiles.userId, partnerId))
            .limit(1);
          
          // Get last message
          const lastMessage = await db.select()
            .from(schema.directMessages)
            .where(
              sql`(${schema.directMessages.senderId} = ${userId} AND ${schema.directMessages.recipientId} = ${partnerId})
                  OR (${schema.directMessages.senderId} = ${partnerId} AND ${schema.directMessages.recipientId} = ${userId})`
            )
            .orderBy(desc(schema.directMessages.createdAt))
            .limit(1);
          
          // Count unread messages
          const unreadCount = await db.select({ count: sql<number>`count(*)` })
            .from(schema.directMessages)
            .where(
              sql`${schema.directMessages.senderId} = ${partnerId} 
                  AND ${schema.directMessages.recipientId} = ${userId} 
                  AND ${schema.directMessages.read} = false`
            );
          
          return {
            partnerId,
            partnerName: profile[0]?.fullName || 'Unknown',
            partnerAvatar: profile[0]?.avatarUrl,
            partnerHeadline: profile[0]?.headline,
            lastMessage: lastMessage[0]?.content || '',
            lastMessageAt: lastMessage[0]?.createdAt,
            unreadCount: Number(unreadCount[0]?.count || 0),
          };
        })
      );
      
      // Sort by last message time
      conversations.sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });
      
      res.json(conversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  
  // Get messages with a specific user
  app.get("/api/messages/:userId", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const currentUserId = req.session.userId;
      const partnerId = parseInt(req.params.userId);
      
      if (isNaN(partnerId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      // Get messages between the two users
      const messages = await db.select()
        .from(schema.directMessages)
        .where(
          sql`(${schema.directMessages.senderId} = ${currentUserId} AND ${schema.directMessages.recipientId} = ${partnerId})
              OR (${schema.directMessages.senderId} = ${partnerId} AND ${schema.directMessages.recipientId} = ${currentUserId})`
        )
        .orderBy(schema.directMessages.createdAt);
      
      // Mark messages as read
      await db.update(schema.directMessages)
        .set({ read: true })
        .where(
          sql`${schema.directMessages.senderId} = ${partnerId} 
              AND ${schema.directMessages.recipientId} = ${currentUserId} 
              AND ${schema.directMessages.read} = false`
        );
      
      res.json(messages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });
  
  // Send a message
  app.post("/api/messages", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const { recipientId, content } = req.body;
      
      if (!recipientId || !content) {
        return res.status(400).json({ error: "Recipient and content are required" });
      }
      
      // Check if recipient exists
      const recipient = await db.select()
        .from(schema.users)
        .where(eq(schema.users.id, recipientId))
        .limit(1);
      
      if (recipient.length === 0) {
        return res.status(404).json({ error: "Recipient not found" });
      }
      
      // Create message
      const [message] = await db.insert(schema.directMessages)
        .values({
          senderId: req.session.userId,
          recipientId: recipientId,
          content: content.trim(),
        })
        .returning();
      
      // Send email notification
      try {
        const sender = await db.select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, req.session.userId))
          .limit(1);
        
        const recipientProfile = await db.select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, recipientId))
          .limit(1);
        
        if (recipientProfile[0]?.email || recipient[0]?.email) {
          const { sendNewMessageEmail } = await import('./email');
          await sendNewMessageEmail(
            recipientProfile[0]?.email || recipient[0].email,
            {
              recipientName: recipientProfile[0]?.fullName || 'there',
              senderName: sender[0]?.fullName || 'Someone',
              messagePreview: content.length > 100 ? content.substring(0, 100) + '...' : content,
              senderAvatar: sender[0]?.avatarUrl,
            }
          );
        }
      } catch (emailError) {
        console.error("Failed to send message notification email:", emailError);
        // Don't fail the request if email fails
      }
      
      res.json(message);
    } catch (error) {
      console.error("Failed to send message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
  // Get unread message count
  app.get("/api/messages/unread/count", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(schema.directMessages)
        .where(
          sql`${schema.directMessages.recipientId} = ${req.session.userId} 
              AND ${schema.directMessages.read} = false`
        );
      
      res.json({ unreadCount: Number(result[0]?.count || 0) });
    } catch (error) {
      console.error("Failed to get unread count:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  // Team Group Messages API
  
  // Get team chats the user is part of
  app.get("/api/team-messages/chats", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const userId = req.session.userId;
      
      // Get teams where user is creator or member
      const userTeamMemberships = await db.select({
        teamId: schema.teamMembers.teamId,
      })
        .from(schema.teamMembers)
        .where(eq(schema.teamMembers.userId, userId));
      
      const createdTeams = await db.select({
        id: schema.teams.id,
      })
        .from(schema.teams)
        .where(eq(schema.teams.createdBy, userId));
      
      // Combine team IDs
      const teamIds = new Set([
        ...userTeamMemberships.map(m => m.teamId),
        ...createdTeams.map(t => t.id),
      ]);
      
      if (teamIds.size === 0) {
        return res.json([]);
      }
      
      // Get full team details
      const userTeams = await db.select({
        id: schema.teams.id,
        name: schema.teams.name,
        description: schema.teams.description,
        createdBy: schema.teams.createdBy,
      })
        .from(schema.teams)
        .where(sql`${schema.teams.id} IN (${sql.join(Array.from(teamIds).map(id => sql`${id}`), sql`,`)})`);
      
      // Get last message and unread count for each team
      const teamChats = await Promise.all(
        userTeams.map(async (team) => {
          // Get last message
          const lastMessage = await db.select({
            content: schema.teamMessages.content,
            createdAt: schema.teamMessages.createdAt,
            senderId: schema.teamMessages.senderId,
          })
            .from(schema.teamMessages)
            .where(eq(schema.teamMessages.teamId, team.id))
            .orderBy(desc(schema.teamMessages.createdAt))
            .limit(1);
          
          // Get user's last read time
          const lastRead = await db.select()
            .from(schema.teamMessageReads)
            .where(
              sql`${schema.teamMessageReads.teamId} = ${team.id} 
                  AND ${schema.teamMessageReads.userId} = ${userId}`
            )
            .limit(1);
          
          // Count unread messages (messages after last read time)
          let unreadCount = 0;
          if (lastRead[0]) {
            const unreadResult = await db.select({ count: sql<number>`count(*)` })
              .from(schema.teamMessages)
              .where(
                sql`${schema.teamMessages.teamId} = ${team.id} 
                    AND ${schema.teamMessages.createdAt} > ${lastRead[0].lastReadAt}
                    AND ${schema.teamMessages.senderId} != ${userId}`
              );
            unreadCount = Number(unreadResult[0]?.count || 0);
          } else {
            // If never read, count all messages not from user
            const unreadResult = await db.select({ count: sql<number>`count(*)` })
              .from(schema.teamMessages)
              .where(
                sql`${schema.teamMessages.teamId} = ${team.id} 
                    AND ${schema.teamMessages.senderId} != ${userId}`
              );
            unreadCount = Number(unreadResult[0]?.count || 0);
          }
          
          // Get sender name for last message
          let senderName = '';
          if (lastMessage[0]) {
            const sender = await db.select({ fullName: schema.profiles.fullName })
              .from(schema.profiles)
              .where(eq(schema.profiles.userId, lastMessage[0].senderId))
              .limit(1);
            senderName = sender[0]?.fullName || 'Unknown';
          }
          
          return {
            teamId: team.id,
            teamName: team.name,
            teamImage: null as string | null,
            lastMessage: lastMessage[0]?.content || '',
            lastMessageAt: lastMessage[0]?.createdAt,
            lastMessageSender: senderName,
            unreadCount,
          };
        })
      );
      
      // Sort by last message time
      teamChats.sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });
      
      res.json(teamChats);
    } catch (error) {
      console.error("Failed to fetch team chats:", error);
      res.status(500).json({ error: "Failed to fetch team chats" });
    }
  });
  
  // Get messages for a specific team
  app.get("/api/team-messages/:teamId", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const userId = req.session.userId;
      const teamId = req.params.teamId;
      
      // Verify user is part of the team
      const team = await db.select()
        .from(schema.teams)
        .where(eq(schema.teams.id, teamId))
        .limit(1);
      
      if (team.length === 0) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      // Check if user is creator or member
      const isCreator = team[0].createdBy === userId;
      const membership = await db.select()
        .from(schema.teamMembers)
        .where(sql`${schema.teamMembers.teamId} = ${teamId} AND ${schema.teamMembers.userId} = ${userId}`)
        .limit(1);
      
      if (!isCreator && membership.length === 0) {
        return res.status(403).json({ error: "Not a member of this team" });
      }
      
      // Get messages with sender info
      const messages = await db.select({
        id: schema.teamMessages.id,
        teamId: schema.teamMessages.teamId,
        senderId: schema.teamMessages.senderId,
        content: schema.teamMessages.content,
        createdAt: schema.teamMessages.createdAt,
        senderName: schema.profiles.fullName,
        senderAvatar: schema.profiles.avatarUrl,
      })
        .from(schema.teamMessages)
        .leftJoin(schema.profiles, eq(schema.teamMessages.senderId, schema.profiles.userId))
        .where(eq(schema.teamMessages.teamId, teamId))
        .orderBy(schema.teamMessages.createdAt);
      
      // Update last read time
      const existingRead = await db.select()
        .from(schema.teamMessageReads)
        .where(
          sql`${schema.teamMessageReads.teamId} = ${teamId} 
              AND ${schema.teamMessageReads.userId} = ${userId}`
        )
        .limit(1);
      
      if (existingRead.length > 0) {
        await db.update(schema.teamMessageReads)
          .set({ lastReadAt: new Date() })
          .where(eq(schema.teamMessageReads.id, existingRead[0].id));
      } else {
        await db.insert(schema.teamMessageReads)
          .values({
            teamId,
            userId,
            lastReadAt: new Date(),
          });
      }
      
      res.json({
        team: {
          id: team[0].id,
          name: team[0].name,
          imageUrl: null as string | null,
        },
        messages,
      });
    } catch (error) {
      console.error("Failed to fetch team messages:", error);
      res.status(500).json({ error: "Failed to fetch team messages" });
    }
  });
  
  // Send a team message
  app.post("/api/team-messages", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const { teamId, content } = req.body;
      const userId = req.session.userId;
      
      if (!teamId || !content) {
        return res.status(400).json({ error: "Team ID and content are required" });
      }
      
      // Verify user is part of the team
      const team = await db.select()
        .from(schema.teams)
        .where(eq(schema.teams.id, teamId))
        .limit(1);
      
      if (team.length === 0) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      // Check if user is creator or member
      const isCreator = team[0].createdBy === userId;
      const membership = await db.select()
        .from(schema.teamMembers)
        .where(sql`${schema.teamMembers.teamId} = ${teamId} AND ${schema.teamMembers.userId} = ${userId}`)
        .limit(1);
      
      if (!isCreator && membership.length === 0) {
        return res.status(403).json({ error: "Not a member of this team" });
      }
      
      // Create message
      const [message] = await db.insert(schema.teamMessages)
        .values({
          teamId,
          senderId: userId,
          content: content.trim(),
        })
        .returning();
      
      // Get sender profile for response
      const sender = await db.select()
        .from(schema.profiles)
        .where(eq(schema.profiles.userId, userId))
        .limit(1);
      
      res.json({
        ...message,
        senderName: sender[0]?.fullName || 'Unknown',
        senderAvatar: sender[0]?.avatarUrl,
      });
    } catch (error) {
      console.error("Failed to send team message:", error);
      res.status(500).json({ error: "Failed to send team message" });
    }
  });

  // ==========================================
  // AI MVP Builder & Pitch Deck APIs
  // ==========================================

  // MVP Builder Chat API with streaming
  app.post("/api/ai/mvp-chat", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { ideaId, message, conversationHistory } = req.body;

      if (!ideaId || !message) {
        return res.status(400).json({ error: "Idea ID and message are required" });
      }

      // Get idea and business plan context
      const idea = await storage.getIdea(ideaId);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      // Get business plan sections if available
      const workflowSections = await db.select()
        .from(schema.ideaWorkflowSections)
        .where(eq(schema.ideaWorkflowSections.ideaId, ideaId));

      const businessPlanContext = workflowSections.length > 0
        ? workflowSections.map(s => `## ${s.sectionType}\n${s.content}`).join("\n\n")
        : "";

      const systemPrompt = `You are the founder's product manager and execution partner.

You have access to a full business plan for a startup. Your job is NOT to summarize it.
Your job is to convert it into a lean MVP whose only purpose is to validate the core assumption.

STARTUP CONTEXT:
- Title: ${idea.title}
- Problem: ${idea.problem}
- Solution: ${idea.solution || "To be defined"}
- Target Users: ${idea.targetUser || "To be identified"}
- Why Now: ${idea.whyNow || "Not specified"}

${businessPlanContext ? `FULL BUSINESS PLAN:\n${businessPlanContext}` : ""}

RULES:
- MVP must be buildable in 2–4 weeks
- Prioritize learning over polish
- Assume legal/compliance sensitivity if applicable
- The founder is non-technical but decisive

YOUR TASKS (when asked to generate MVP spec):
1. Extract the single most important assumption to validate first
2. Define the narrowest possible MVP to test that assumption
3. Specify the happy-path user flow only
4. List exactly 5 must-have features max
5. Explicitly list what we are NOT building yet
6. Recommend the fastest tools (no-code / low-code / AI-assisted like Manus.AI, Lovable, Replit Agent)
7. Define ONE success metric for the first 30 days
8. Call out any feature in the plan that should be delayed, even if it feels "important"

Be opinionated. If something is overkill for MVP, cut it.
Use markdown formatting with clear headers.
Be concise, practical, and encouraging. Focus on what's achievable.`;

      const OpenAI = (await import("openai")).default;
      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      
      if (!apiKey) {
        return res.status(500).json({ error: "AI service not configured" });
      }

      const client = new OpenAI({ apiKey, baseURL });

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 4096,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("MVP chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process chat" });
      }
    }
  });

  // Pitch Deck Generator API
  app.post("/api/ai/pitch-deck", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { ideaId } = req.body;

      if (!ideaId) {
        return res.status(400).json({ error: "Idea ID is required" });
      }

      const idea = await storage.getIdea(ideaId);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      // Get business plan sections
      const workflowSections = await db.select()
        .from(schema.ideaWorkflowSections)
        .where(eq(schema.ideaWorkflowSections.ideaId, ideaId));

      const businessPlanContext = workflowSections.length > 0
        ? workflowSections.map(s => `## ${s.sectionType}\n${s.content}`).join("\n\n")
        : "";

      const prompt = `You are an expert pitch deck creator for startups. Create a compelling 10-slide pitch deck for this startup idea.

STARTUP IDEA:
- Title: ${idea.title}
- Problem: ${idea.problem}
- Solution: ${idea.solution || "To be defined based on problem analysis"}
- Target Users: ${idea.targetUser || "To be identified"}
- Why Now: ${idea.whyNow || ""}

${businessPlanContext ? `BUSINESS PLAN CONTEXT:\n${businessPlanContext}` : ""}

Create a JSON response with exactly 10 slides. Each slide should have:
- title: The slide title
- content: Markdown formatted content for the slide (2-5 bullet points or a short paragraph)
- speakerNotes: What the presenter should say (1-2 sentences)

The 10 slides should be:
1. Title Slide - Company name, tagline, one-liner
2. The Problem - Pain point you're solving
3. The Solution - Your unique approach
4. Market Opportunity - TAM/SAM/SOM, market trends
5. Product - Key features, screenshots placeholder description
6. Business Model - How you make money
7. Traction - Current progress, milestones achieved
8. Competition - Competitive landscape, your differentiation
9. The Team - Founder backgrounds, why you're qualified
10. The Ask - Funding amount, use of funds, next steps

Format your response as valid JSON:
{
  "slides": [
    {"title": "...", "content": "...", "speakerNotes": "..."},
    ...
  ]
}

Make the content compelling, specific to this startup, and investor-ready. Use markdown formatting (bold, bullets, headers) in the content.`;

      const OpenAI = (await import("openai")).default;
      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      
      if (!apiKey) {
        return res.status(500).json({ error: "AI service not configured" });
      }

      const client = new OpenAI({ apiKey, baseURL });

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8192,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to generate pitch deck" });
      }

      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (error) {
      console.error("Pitch deck generation error:", error);
      res.status(500).json({ error: "Failed to generate pitch deck" });
    }
  });

  // Pitch Deck Chat API for refining slides
  app.post("/api/ai/pitch-chat", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { ideaId, message, currentSlide, slideIndex, conversationHistory } = req.body;

      if (!ideaId || !message) {
        return res.status(400).json({ error: "Idea ID and message are required" });
      }

      const idea = await storage.getIdea(ideaId);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      const systemPrompt = `You are an expert pitch deck consultant helping a university student founder refine their pitch deck slides.

STARTUP: ${idea.title}
PROBLEM: ${idea.problem}
SOLUTION: ${idea.solution || "To be defined"}

${currentSlide ? `CURRENT SLIDE (${slideIndex + 1}):
Title: ${currentSlide.title}
Content: ${currentSlide.content}
Speaker Notes: ${currentSlide.speakerNotes || "None"}` : ""}

Your role:
1. Help improve the slide content based on the user's request
2. Make suggestions more compelling, clear, and investor-ready
3. When providing an updated slide, include it in your response

If you're updating the slide, include a JSON block at the end of your response like this:
\`\`\`json:updatedSlide
{"title": "...", "content": "...", "speakerNotes": "..."}
\`\`\`

Be concise and actionable in your feedback.`;

      const OpenAI = (await import("openai")).default;
      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      
      if (!apiKey) {
        return res.status(500).json({ error: "AI service not configured" });
      }

      const client = new OpenAI({ apiKey, baseURL });

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: message },
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 2048,
        stream: true,
      });

      let fullContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullContent += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Check if there's an updated slide in the response
      const slideMatch = fullContent.match(/```json:updatedSlide\n([\s\S]*?)```/);
      if (slideMatch) {
        try {
          const updatedSlide = JSON.parse(slideMatch[1]);
          res.write(`data: ${JSON.stringify({ updatedSlide })}\n\n`);
        } catch {}
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Pitch chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process chat" });
      }
    }
  });

  // Investor Pitch Deck - AI Analysis endpoint (auto-populates from business plan)
  app.post("/api/ai/investor-pitch-deck/analyze", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { ideaId, uploadedPlan } = req.body;

      if (!ideaId) {
        return res.status(400).json({ error: "Idea ID is required" });
      }

      const idea = await storage.getIdea(ideaId);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      let businessPlanContent = "";
      
      if (uploadedPlan && uploadedPlan.length > 100) {
        businessPlanContent = uploadedPlan;
      } else {
        const workflowSections = await db.select()
          .from(schema.ideaWorkflowSections)
          .where(eq(schema.ideaWorkflowSections.ideaId, ideaId));

        businessPlanContent = workflowSections.map(s => `## ${s.sectionType}\n${s.content}`).join("\n\n");
      }

      if (!businessPlanContent || businessPlanContent.length < 100) {
        return res.status(400).json({ 
          error: "Insufficient business plan content",
          message: "Please complete your business plan before generating a pitch deck. We need enough context to create investor-grade content."
        });
      }

      const prompt = `You are a seasoned startup advisor with deep experience in fundraising. Analyze this business plan and extract all relevant context for an investor pitch deck.

BUSINESS PLAN:
${businessPlanContent}

IDEA TITLE: ${idea.title}
IDEA PROBLEM: ${idea.problem || "Not specified"}
IDEA SOLUTION: ${idea.solution || "Not specified"}

YOUR TASK:
Analyze this business plan and determine:
1. The recommended investor type (angel vs VC) based on company stage, metrics, and market
2. The recommended fundraising amount based on typical raises for this stage/market
3. The fundraising stage (pre_seed or seed)
4. Extract the key pitch elements

DECISION CRITERIA:
- Recommend ANGEL if: early-stage, pre-product, limited traction, founder-story driven, raising under $500K
- Recommend VC if: has product, some traction, large TAM, raising $500K+, needs institutional backing

Return a JSON object with this EXACT structure:
{
  "analysis": {
    "investorMode": "angel" or "vc",
    "investorModeReason": "Brief explanation of why this investor type is recommended",
    "deckType": "full" or "warm_intro",
    "deckTypeReason": "Brief explanation of deck type recommendation",
    "fundraisingStage": "pre_seed" or "seed",
    "targetRaise": "Specific amount like $250K or $1.5M",
    "raiseReason": "Brief explanation of raise amount recommendation"
  },
  "extractedContext": {
    "startupName": "Company name from business plan",
    "problemStatement": "One clear sentence describing the problem",
    "solutionStatement": "One clear sentence describing the solution",
    "currentTraction": "Summary of traction, metrics, or 'Pre-traction: [description]' if early",
    "founderBackground": "Relevant founder experience extracted from plan",
    "geography": "Target market geography",
    "keyInsights": ["3-5 key insights that should inform the deck"],
    "warnings": ["Any concerns or gaps that the founder should address"]
  },
  "nextSteps": {
    "instruction": "Clear instruction for what the founder should do next",
    "tips": ["2-3 tips for improving the pitch"]
  }
}`;

      const OpenAI = (await import("openai")).default;
      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      
      if (!apiKey) {
        return res.status(500).json({ error: "AI service not configured" });
      }

      const client = new OpenAI({ apiKey, baseURL });

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to analyze business plan" });
      }

      const parsed = JSON.parse(content);
      res.json({
        success: true,
        ideaTitle: idea.title,
        ...parsed
      });
    } catch (error) {
      console.error("Business plan analysis error:", error);
      res.status(500).json({ error: "Failed to analyze business plan" });
    }
  });

  // Investor Pitch Deck Generator API - Main generation endpoint
  app.post("/api/ai/investor-pitch-deck", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { pitchContext, ideaId } = req.body;

      if (!pitchContext) {
        return res.status(400).json({ error: "Pitch context is required" });
      }

      const {
        startupName,
        fundraisingStage,
        targetRaise,
        investorMode,
        deckType,
        geography,
        problemStatement,
        solutionStatement,
        currentTraction,
        founderBackground,
        businessPlanNotes
      } = pitchContext;

      // Get additional context from idea if provided
      let ideaContext = "";
      if (ideaId) {
        const idea = await storage.getIdea(ideaId);
        if (idea) {
          const workflowSections = await db.select()
            .from(schema.ideaWorkflowSections)
            .where(eq(schema.ideaWorkflowSections.ideaId, ideaId));

          if (workflowSections.length > 0) {
            ideaContext = workflowSections.map(s => `## ${s.sectionType}\n${s.content}`).join("\n\n");
          }
        }
      }

      const isWarmIntro = deckType === "warm_intro";
      const isAngel = investorMode === "angel";
      const slideCount = isWarmIntro ? 6 : 10;
      const maxBullets = isWarmIntro ? 3 : 4;

      const slideStructure = isWarmIntro 
        ? `1. Problem
2. Solution
3. Why Now
4. Proof / Traction
5. Market Opportunity
6. Team + Ask`
        : `1. Title & Hook
2. Problem
3. Solution
4. Why Now
5. Market Opportunity
6. Product
7. Business Model
8. Traction
9. Competition
10. Team + The Ask`;

      const investorTone = isAngel
        ? `ANGEL INVESTOR OPTIMIZATION:
- Emphasize founder credibility and story
- Focus on narrative clarity and emotional resonance
- Highlight clear first milestone post-investment
- Use simple language and intuitive framing
- Show early conviction signals`
        : `VC INVESTOR OPTIMIZATION:
- Emphasize scale potential and repeatability
- Focus on market size, "Why Now" timing, and defensibility
- Highlight competitive positioning with institutional tone
- Show metrics discipline and wedge + expansion strategy
- Use professional, data-driven language`;

      const prompt = `You are a top-tier investor who has reviewed 10,000+ pitch decks. Your task is to generate investor-grade pitch deck content.

${investorTone}

STARTUP CONTEXT:
- Startup Name: ${startupName}
- Fundraising Stage: ${fundraisingStage === "pre_seed" ? "Pre-seed" : "Seed"}
- Target Raise: ${targetRaise}
- Geography: ${geography}
- Problem: ${problemStatement}
- Solution: ${solutionStatement}
- Current Traction: ${currentTraction}
- Founder Background: ${founderBackground}

${businessPlanNotes ? `ADDITIONAL NOTES:\n${businessPlanNotes}\n` : ""}
${ideaContext ? `BUSINESS PLAN CONTEXT:\n${ideaContext}\n` : ""}

Generate a ${isWarmIntro ? "6-slide WARM INTRO deck (designed for email/LinkedIn intros, understandable in under 2 minutes)" : "10-slide FULL PITCH DECK (for formal investor meetings)"}.

REQUIRED SLIDES:
${slideStructure}

For EACH slide, generate using this EXACT structure:
{
  "slideNumber": <number>,
  "slideTitle": "<title>",
  "investorBelief": "<what the investor must believe after this slide>",
  "primaryHeadline": "<ONE strong sentence - the main slide title>",
  "supportingSubheadline": "<one clarifying sentence, optional>",
  "keyPoints": ["<bullet 1>", "<bullet 2>", "<bullet 3>"${!isWarmIntro ? ', "<bullet 4>"' : ""}],
  "suggestedVisual": "<e.g. bar chart, comparison table, funnel, timeline, icon row>",
  "presenterNotes": "<clarifying context for the presenter, not for slide>"
}

Also generate a metrics validation table:
{
  "metricsValidation": [
    {
      "slideNumber": <number>,
      "slideTitle": "<title>",
      "metricsRequired": "<what data investors will look for>",
      "proxyMetrics": "<acceptable alternatives for early stage>",
      "riskLevel": "<Low|Medium|High>",
      "sensitivityNotes": "<investor concerns>"
    }
  ]
}

CRITICAL RULES:
- No paragraphs on slides - bullet points only
- No buzzwords or vague claims
- Slide-ready language only
- Maximum ${maxBullets} bullet points per slide
- Each bullet must be specific and evidence-based where possible

Return ONLY valid JSON with this structure:
{
  "slides": [...],
  "metricsValidation": [...]
}`;

      const OpenAI = (await import("openai")).default;
      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      
      if (!apiKey) {
        return res.status(500).json({ error: "AI service not configured" });
      }

      const client = new OpenAI({ apiKey, baseURL });

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8192,
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to generate pitch deck" });
      }

      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (error) {
      console.error("Investor pitch deck generation error:", error);
      res.status(500).json({ error: "Failed to generate pitch deck" });
    }
  });

  // Investor Pitch Deck Refinement - "Investor-Proof This Deck"
  app.post("/api/ai/investor-pitch-deck/refine", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { pitchContext, slides, ideaId } = req.body;

      if (!slides || slides.length === 0) {
        return res.status(400).json({ error: "Slides are required for refinement" });
      }

      const isAngel = pitchContext?.investorMode === "angel";
      const isWarmIntro = pitchContext?.deckType === "warm_intro";

      const slidesJson = JSON.stringify(slides, null, 2);

      const prompt = `You are a ruthless investor editor. Your job is to investor-proof this pitch deck.

CURRENT DECK:
${slidesJson}

INVESTOR MODE: ${isAngel ? "Angel (focus on founder story, clarity, emotional resonance)" : "VC (focus on scale, metrics, defensibility)"}
DECK TYPE: ${isWarmIntro ? "Warm Intro (6 slides, must be digestible in 2 minutes)" : "Full Deck (10+ slides for formal meetings)"}

YOUR TASK:
1. Tighten ALL headlines - make them punchier and more memorable
2. Remove ALL vague claims - replace with specific signals or delete
3. Eliminate buzzwords and fluff
4. Add "Why Now" logic if missing from any slide
5. Ensure each slide has ONE clear investor belief it must create
6. Make key points concrete and evidence-based

CRITICAL RULES:
- Return ONLY the refined slides, no explanations
- Keep the exact same JSON structure
- Maximum ${isWarmIntro ? "3" : "4"} key points per slide
- Each headline must pass the "so what?" test
- No slide should have more than one core message

Return the refined deck as valid JSON:
{
  "slides": [...]
}`;

      const OpenAI = (await import("openai")).default;
      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      
      if (!apiKey) {
        return res.status(500).json({ error: "AI service not configured" });
      }

      const client = new OpenAI({ apiKey, baseURL });

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8192,
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to refine pitch deck" });
      }

      const parsed = JSON.parse(content);
      res.json(parsed);
    } catch (error) {
      console.error("Investor pitch deck refinement error:", error);
      res.status(500).json({ error: "Failed to refine pitch deck" });
    }
  });

  // Pitch Preparation Module - Delivery Script & Objection Playbook
  app.post("/api/ai/pitch-preparation", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { ideaId, investorMode, pitchDeckSlides, businessPlan } = req.body;

      if (!pitchDeckSlides || pitchDeckSlides.length === 0) {
        return res.status(400).json({ error: "Pitch deck slides are required" });
      }

      const isAngel = investorMode === "angel";
      const slidesJson = JSON.stringify(pitchDeckSlides, null, 2);

      const prompt = `You are a senior venture investor and pitch coach who has sat through hundreds of founder presentations.

Your task is to prepare this founder for their investor pitch - not to create slides, but to help them DELIVER the pitch, handle objections, and survive live Q&A.

PITCH DECK SLIDES:
${slidesJson}

BUSINESS PLAN CONTEXT:
${businessPlan || "Not provided"}

INVESTOR MODE: ${isAngel ? "Angel Investors (focus on founder story, vision, personal conviction)" : "Institutional VCs (focus on scale, metrics, defensibility, returns)"}

Generate a comprehensive pitch preparation package with three sections:

## SECTION 1: DELIVERY SCRIPT
For EACH slide in the pitch deck, generate a spoken delivery script. The founder should be able to read this and practice saying it out loud.

## SECTION 2: INVESTOR OBJECTIONS
Generate 10-15 high-probability investor objections grouped by these categories:
- Problem & Urgency
- Solution & Differentiation
- Market Size & Returns
- Traction / Proof
- Business Model
- Go-To-Market
- Competition
- Team
- Timing / Why Now
- Risk & Downside

For each objection, include:
- The exact wording an investor would use (be tough, not polite)
- Why this concern comes up
- Risk level (Low/Medium/High)
- Best short answer for live pitch (1-2 sentences, calm and confident)
- Expanded answer if they push further (max 4 sentences)
- What NOT to say (common founder mistakes)
- Objection type (Clarifiable / Needs Proof Soon / Structural Risk / Likely Deal-Breaker)
- What would reduce this concern (specific evidence or milestone)

## SECTION 3: RAPID-FIRE REHEARSAL
Generate 10-12 rapid-fire practice questions for the founder to answer out loud:
- Increasing difficulty
- Cover different aspects of the business
- Include ideal answer and time guidance (e.g., "Under 20 seconds")

CRITICAL RULES:
- Be TOUGH. Real investors are skeptical.
- No polite phrasing in objections. Use real investor language.
- Delivery scripts should sound SPOKEN, not written
- Focus on ${isAngel ? "founder conviction and narrative clarity" : "metrics, scale potential, and market opportunity"}

Return as valid JSON:
{
  "deliveryScript": [
    {
      "slideNumber": 1,
      "slideTitle": "string",
      "whatYouSay": "string (30-60 seconds of natural spoken language)",
      "keyEmphasis": "string (what investors should remember)",
      "deliveryTip": "string (pacing, tone guidance)"
    }
  ],
  "objections": [
    {
      "id": 1,
      "category": "string",
      "objection": "string (exact investor wording)",
      "whyThisComesUp": "string",
      "riskLevel": "Low" | "Medium" | "High",
      "bestShortAnswer": "string",
      "ifTheyPushFurther": "string",
      "whatNotToSay": "string",
      "objectionType": "Clarifiable" | "Needs Proof Soon" | "Structural Risk" | "Likely Deal-Breaker",
      "whatWouldReduceConcern": "string"
    }
  ],
  "rehearsalQuestions": [
    {
      "question": "string",
      "idealAnswer": "string",
      "timeGuidance": "string"
    }
  ]
}`;

      const OpenAI = (await import("openai")).default;
      const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      
      if (!apiKey) {
        return res.status(500).json({ error: "AI service not configured" });
      }

      const client = new OpenAI({ apiKey, baseURL });

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 12000,
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ error: "Failed to generate preparation" });
      }

      const parsed = JSON.parse(content);
      res.json({ success: true, data: parsed });
    } catch (error) {
      console.error("Pitch preparation generation error:", error);
      res.status(500).json({ error: "Failed to generate pitch preparation" });
    }
  });
}
