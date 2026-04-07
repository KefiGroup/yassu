import express, { Request, Response, Express } from "express";
import { storage } from "./storage";
import { pool, db } from "./db";
import * as schema from "../shared/schema";
import { eq, sql, desc, asc, or, and, lte, gt, isNull, ilike } from "drizzle-orm";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { generateBusinessPlan } from "./ai";
import { analyzeRawIdea, type RawIdeaInput } from "./ai-wizard";
import { generateSmartMatches, type MatchingNeeds } from "./smart-matching";
import { trackReferral, getUserReferrals, getUserReferralStats, getAllReferrals, initReferralsTable } from "./referrals";
import { getPipelineStats, getPipelineIdeas } from "./pipeline";
import ideaInterestsRouter from "./idea-interests";
import { registerObjectStorageRoutes, ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage";
import { generateImageBuffer } from "./replit_integrations/image/client";

const objectStorageService = new ObjectStorageService();

// Helper function to generate AI cover image for an idea
async function generateIdeaCoverImage(ideaId: string, title: string, problem: string | null): Promise<string> {
  console.log(`[CoverImage] Generating cover for idea ${ideaId}: "${title}"`);
  
  // Create a unique prompt based on the idea's title and problem
  const contextHint = problem ? ` solving this problem: ${problem.substring(0, 100)}` : "";
  const prompt = `Create a unique, modern flat illustration for a business called "${title}"${contextHint}. 
Style: clean corporate illustration with people, objects, and scenes relevant to the specific business concept. 
Use a cohesive color palette of soft purples, blues, teals, and warm accents.
Show professionals or customers interacting with the product/service.
NO rockets, NO spaceships, NO launch imagery unless the business is specifically about space.
NO text, NO words, NO logos in the image.
Make it look like a professional SaaS or app marketing illustration.`;
  
  // Generate the image
  console.log(`[CoverImage] Calling AI image generation...`);
  const imageBuffer = await generateImageBuffer(prompt, "1024x1024");
  console.log(`[CoverImage] Image generated, size: ${imageBuffer.length} bytes`);
  
  // Upload to object storage using the objectStorageClient
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  }
  
  const fileName = `idea-covers/${ideaId}-${Date.now()}.png`;
  const bucket = objectStorageClient.bucket(bucketId);
  const file = bucket.file(fileName);
  
  // Upload the buffer
  console.log(`[CoverImage] Uploading to ${fileName}...`);
  await file.save(imageBuffer, {
    contentType: "image/png",
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });
  
  // Return the internal path (will be served via API endpoint)
  // Format: /api/cover-images/bucket/filename
  const coverPath = `/api/cover-images/${bucketId}/${fileName}`;
  console.log(`[CoverImage] Upload complete: ${coverPath}`);
  
  return coverPath;
}

// Stage order for determining the "highest" stage achieved
const stageOrder = ['idea_posted', 'business_plan', 'find_advisors', 'form_team', 'build_mvp', 'yassu_foundry', 'launched'] as const;
type IdeaStage = typeof stageOrder[number];

// Helper to update idea stage if the new stage is "higher" than current
async function updateIdeaStageIfHigher(ideaId: string, newStage: IdeaStage) {
  const idea = await storage.getIdea(ideaId);
  if (!idea) return;
  
  const currentIndex = stageOrder.indexOf(idea.stage as IdeaStage || 'idea_posted');
  const newIndex = stageOrder.indexOf(newStage);
  
  if (newIndex > currentIndex) {
    await storage.updateIdea(ideaId, { stage: newStage });
    console.log(`[Stage Update] Idea ${ideaId} stage updated from ${idea.stage} to ${newStage}`);
  }
}

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

// Document upload for business plans (PDF/DOCX)
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF and DOCX files are allowed."));
    }
  },
});

declare module "express-session" {
  interface SessionData {
    userId?: number;
    rememberMe?: boolean;
    lastActivity?: number;
    brand?: string | null;
  }
}

async function classifyIdeaIndustries(title: string, problem: string, solution?: string | null): Promise<string[]> {
  try {
    const industryNames = schema.PREDEFINED_INDUSTRIES.map(i => i.name);
    const prompt = `You are an expert startup classifier. Based on the startup idea below, select the single BEST industry that fits this idea from the EXACT list provided. Return ONLY a JSON array with exactly 1 industry name.

IDEA:
Title: ${title}
Problem: ${problem}
${solution ? `Solution: ${solution}` : ''}

AVAILABLE INDUSTRIES (choose ONLY from this list):
${industryNames.join(', ')}

Return valid JSON array with exactly 1 industry, e.g.: ["Technology & Software"]`;

    const OpenAI = (await import('openai')).default;
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);
    const openai = new OpenAI({ apiKey, baseURL });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You classify startup ideas into industries. Always respond with a valid JSON array of industry names only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 200,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);
    const industries: string[] = Array.isArray(parsed) ? parsed : (parsed.industries || parsed.categories || []);
    return industries.filter(name => industryNames.includes(name)).slice(0, 1);
  } catch (error) {
    console.error("AI industry classification error:", error);
    return [];
  }
}

async function classifyProfileIndustries(bio: string, skills: string[], interests: string[]): Promise<string[]> {
  try {
    const industryNames = schema.PREDEFINED_INDUSTRIES.map(i => i.name);
    const prompt = `You are an expert at identifying professional industry experience. Based on the person's profile below, select 1-3 industries they have experience in from the EXACT list provided. Return ONLY a JSON object with an "industries" array.

PROFILE:
Bio: ${bio || 'Not provided'}
Skills: ${skills.length > 0 ? skills.join(', ') : 'Not provided'}
Interests: ${interests.length > 0 ? interests.join(', ') : 'Not provided'}

AVAILABLE INDUSTRIES (choose ONLY from this list):
${industryNames.join(', ')}

Return valid JSON only, e.g.: {"industries": ["Technology & Software", "AI & Machine Learning"]}`;

    const OpenAI = (await import('openai')).default;
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);
    const openai = new OpenAI({ apiKey, baseURL });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You identify professional industry experience from profiles. Always respond with a valid JSON object containing an 'industries' array." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 200,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseText);
    const industries: string[] = Array.isArray(parsed) ? parsed : (parsed.industries || parsed.categories || []);
    return industries.filter(name => industryNames.includes(name)).slice(0, 5);
  } catch (error) {
    console.error("AI profile industry classification error:", error);
    return [];
  }
}

export function registerRoutes(app: Express): void {
  app.use((req, res, next) => {
    if (/^\/BRUIN/i.test(req.path) && req.path !== req.path.replace(/^\/BRUIN/i, '/bruin')) {
      const normalized = req.originalUrl.replace(/^\/BRUIN/i, '/bruin');
      return res.redirect(301, normalized);
    }
    next();
  });

  // Initialize referrals table and seed industries
  initReferralsTable().catch(console.error);
  storage.seedIndustries().catch(console.error);

  // Auto-classify any unclassified ideas on startup (non-blocking)
  (async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const allIdeas = await storage.getIdeas();
      for (const idea of allIdeas) {
        const existing = await storage.getIdeaIndustries(idea.id);
        if (existing.length === 0) {
          console.log(`[auto-classify] Classifying idea: ${idea.title}`);
          try {
            const industryNames = await classifyIdeaIndustries(idea.title, idea.problem, idea.solution);
            if (industryNames.length > 0) {
              const allIndustries = await storage.getIndustries();
              const industryIds = industryNames
                .map(name => allIndustries.find(i => i.name === name)?.id)
                .filter((id): id is number => id !== undefined);
              if (industryIds.length > 0) {
                await storage.addIdeaIndustries(idea.id, industryIds);
                console.log(`[auto-classify] Classified "${idea.title}" into: ${industryNames.join(', ')}`);
              }
            }
          } catch (err) {
            console.error(`[auto-classify] Failed for "${idea.title}":`, err);
          }
        } else if (existing.length > 1) {
          console.log(`[auto-classify] Trimming "${idea.title}" from ${existing.length} industries to 1`);
          try {
            const keepId = existing[0].id;
            await storage.removeIdeaIndustries(idea.id);
            await storage.addIdeaIndustries(idea.id, [keepId]);
            console.log(`[auto-classify] Trimmed "${idea.title}" to: ${existing[0].name}`);
          } catch (err) {
            console.error(`[auto-classify] Failed trimming "${idea.title}":`, err);
          }
        }
      }
      console.log('[auto-classify] Completed industry classification check');
    } catch (err) {
      console.error('[auto-classify] Error during startup classification:', err);
    }
  })();

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Register idea interests routes
  app.use(ideaInterestsRouter);

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, fullName, brand } = req.body;
      
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

      // Auto-accept any pending group invites for this email
      try {
        const pendingInvites = await storage.getPendingGroupInvitesByEmail(email);
        for (const invite of pendingInvites) {
          await storage.acceptGroupInvite(invite.token, user.id);
          console.log(`[Registration] Auto-accepted group invite for ${email} to group ${invite.groupId}`);
        }
      } catch (inviteErr) {
        console.error(`[Registration] Failed to auto-accept invites for ${email}:`, inviteErr);
      }

      // Auto-attach to groups where this email was listed as a team member in an application
      try {
        const teamApps = await storage.getApplicationsByTeamEmail(email.toLowerCase());
        for (const teamApp of teamApps) {
          const members = await storage.getGroupMembers(teamApp.groupId);
          const alreadyMember = members.some(m => m.userId === user.id);
          if (!alreadyMember) {
            await storage.addGroupMember(teamApp.groupId, user.id, 'member');
            console.log(`[Registration] Auto-attached ${email} as team member to group ${teamApp.groupId} from application ${teamApp.id}`);
          }
        }
      } catch (teamErr) {
        console.error(`[Registration] Failed to auto-attach team member for ${email}:`, teamErr);
      }

      // Send welcome email (don't wait for it to avoid blocking)
      const { sendWelcomeEmail } = await import('./email');
      console.log(`[Registration] Sending welcome email to: ${user.email}`);
      sendWelcomeEmail(user.email, fullName || 'there')
        .then(() => {
          console.log(`[Registration] Welcome email sent successfully to: ${user.email}`);
        })
        .catch(err => {
          console.error(`[Registration] Failed to send welcome email to ${user.email}:`, err);
        });

      req.session.userId = user.id;
      req.session.rememberMe = false;
      req.session.lastActivity = Date.now();
      req.session.brand = brand || null;
      
      // Explicitly save session before responding
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Failed to save session' });
        }
        res.json({ 
          user: { id: user.id, email: user.email, fullName: user.fullName },
          sessionTimeout: 60 * 60 * 1000 // 1 hour for new accounts
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });
  
  // Session ping endpoint - extends session activity
  app.post("/api/auth/ping", (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Update last activity timestamp
    req.session.lastActivity = Date.now();
    
    req.session.save((err) => {
      if (err) {
        console.error('Session ping save error:', err);
        return res.status(500).json({ error: 'Failed to update session' });
      }
      res.json({ 
        success: true, 
        lastActivity: req.session.lastActivity 
      });
    });
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password, rememberMe, brand } = req.body;
      console.log(`[Login] Attempt for email: ${email}, rememberMe: ${rememberMe}, brand: ${brand}`);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`[Login] User not found for email: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        console.log(`[Login] Invalid password for user: ${user.id}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const sessionMaxAge = rememberMe 
        ? 30 * 24 * 60 * 60 * 1000  // 30 days
        : 60 * 60 * 1000;           // 1 hour

      let responded = false;
      const regenTimeout = setTimeout(() => {
        if (!responded) {
          responded = true;
          console.error('[Login] Session regenerate timed out for user:', user.id);
          res.status(503).json({ error: 'Session service temporarily unavailable. Please try again.' });
        }
      }, 5000);

      req.session.regenerate((regenerateErr) => {
        if (responded) return;
        if (regenerateErr) {
          clearTimeout(regenTimeout);
          responded = true;
          console.error('[Login] Session regenerate error:', regenerateErr);
          req.session.userId = user.id;
          req.session.rememberMe = rememberMe || false;
          req.session.lastActivity = Date.now();
          req.session.brand = brand || null;
          if (req.session.cookie) {
            req.session.cookie.maxAge = sessionMaxAge;
          }
          req.session.save((fallbackErr) => {
            if (fallbackErr) {
              console.error('[Login] Fallback session save also failed:', fallbackErr);
              return res.status(500).json({ error: 'Failed to create session' });
            }
            console.log(`[Login] Success (fallback) for user ${user.id} (${user.email}), session: ${req.session.id}`);
            res.json({ 
              user: { id: user.id, email: user.email, fullName: user.fullName },
              sessionTimeout: rememberMe ? null : 60 * 60 * 1000
            });
          });
          return;
        }

        req.session.userId = user.id;
        req.session.rememberMe = rememberMe || false;
        req.session.lastActivity = Date.now();
        req.session.brand = brand || null;
        if (req.session.cookie) {
          req.session.cookie.maxAge = sessionMaxAge;
        }

        req.session.save((saveErr) => {
          clearTimeout(regenTimeout);
          if (responded) return;
          responded = true;
          if (saveErr) {
            console.error('[Login] Session save error:', saveErr);
            return res.status(500).json({ error: 'Failed to save session' });
          }
          console.log(`[Login] Success for user ${user.id} (${user.email}), session: ${req.session.id}, rememberMe: ${rememberMe}`);
          res.json({ 
            user: { id: user.id, email: user.email, fullName: user.fullName },
            sessionTimeout: rememberMe ? null : 60 * 60 * 1000
          });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const sessionId = req.session.id;
    const userId = req.session.userId;
    console.log(`[Logout] Destroying session ${sessionId} for user ${userId}`);
    
    req.session.destroy((err) => {
      if (err) {
        console.error('[Logout] Failed to destroy session:', err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      // Clear the session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      console.log(`[Logout] Session destroyed and cookie cleared`);
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
      
      // Update lastActivity on every authenticated request
      req.session.lastActivity = Date.now();
      
      // Determine session timeout based on rememberMe setting
      const rememberMe = req.session.rememberMe || false;
      const sessionTimeout = rememberMe ? null : 60 * 60 * 1000; // null for remember me, 1 hour otherwise
      
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
        sessionTimeout: sessionTimeout,
        lastActivity: req.session.lastActivity || Date.now(),
        brand: req.session.brand || null,
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get user roles
  app.get("/api/user/roles", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const roles = await storage.getUserRoles(req.session.userId);
      res.json(roles);
    } catch (error) {
      console.error("Get user roles error:", error);
      res.status(500).json({ error: "Failed to fetch user roles" });
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
      const body = req.body;
      console.log('[profile-update] User ID:', req.session.userId);

      // Validate yassuRole if provided
      if (body.yassuRole !== undefined) {
        const validRoles = ['ambassador', 'advisor', null];
        if (!validRoles.includes(body.yassuRole)) {
          return res.status(400).json({ error: "Invalid Yassu role" });
        }
      }

      const profileData: Record<string, any> = {};
      if (body.fullName !== undefined) profileData.fullName = body.fullName || null;
      if (body.bio !== undefined) profileData.bio = body.bio || null;
      if (body.major !== undefined) profileData.major = body.major || null;
      if (body.graduationYear !== undefined) {
        const gy = body.graduationYear;
        profileData.graduationYear = (gy !== null && gy !== '' && !isNaN(Number(gy))) ? Number(gy) : null;
      }
      if (body.universityId !== undefined) profileData.universityId = body.universityId || null;
      if (body.otherUniversity !== undefined) profileData.otherUniversity = body.otherUniversity || null;
      if (body.availability !== undefined) profileData.availability = body.availability || null;
      if (body.linkedinUrl !== undefined) profileData.linkedinUrl = body.linkedinUrl || null;
      if (body.githubUrl !== undefined) profileData.githubUrl = body.githubUrl || null;
      if (body.portfolioUrl !== undefined) profileData.portfolioUrl = body.portfolioUrl || null;
      if (body.skills !== undefined) profileData.skills = Array.isArray(body.skills) ? body.skills : [];
      if (body.interests !== undefined) profileData.interests = Array.isArray(body.interests) ? body.interests : [];
      if (body.clubType !== undefined) profileData.clubType = body.clubType || null;
      if (body.headline !== undefined) profileData.headline = body.headline || null;
      if (body.onboardingCompleted !== undefined) profileData.onboardingCompleted = !!body.onboardingCompleted;
      if (body.yassuRole !== undefined) profileData.yassuRole = body.yassuRole;
      if (body.lookingFor !== undefined) {
        profileData.lookingFor = Array.isArray(body.lookingFor) ? JSON.stringify(body.lookingFor) : (body.lookingFor || null);
      }
      if (body.experience !== undefined) profileData.experience = body.experience || null;
      if (body.emailNotificationsEnabled !== undefined) profileData.emailNotificationsEnabled = !!body.emailNotificationsEnabled;
      if (body.ideaUpdatesEnabled !== undefined) profileData.ideaUpdatesEnabled = !!body.ideaUpdatesEnabled;
      if (body.teamInvitesEnabled !== undefined) profileData.teamInvitesEnabled = !!body.teamInvitesEnabled;
      if (body.messageNotificationsEnabled !== undefined) profileData.messageNotificationsEnabled = !!body.messageNotificationsEnabled;
      if (body.profilePublic !== undefined) profileData.profilePublic = !!body.profilePublic;
      if (body.avatarUrl !== undefined) profileData.avatarUrl = body.avatarUrl || null;

      if (profileData.universityId) {
        const uniCheck = await db.select({ id: schema.universities.id }).from(schema.universities).where(eq(schema.universities.id, profileData.universityId));
        if (uniCheck.length === 0) {
          console.log('[profile-update] University ID not found, clearing:', profileData.universityId);
          profileData.universityId = null;
        }
      }

      console.log('[profile-update] Sanitized fields:', Object.keys(profileData).join(', '));

      const existing = await storage.getProfile(req.session.userId);
      let profile;

      if (existing) {
        profile = await storage.updateProfile(req.session.userId, profileData);
      } else {
        console.log('[profile-update] No existing profile, creating for user:', req.session.userId);
        const user = await storage.getUser(req.session.userId);
        profile = await storage.createProfile(req.session.userId, {
          ...profileData,
          email: user?.email || null,
          verificationStatus: "pending",
          onboardingCompleted: profileData.onboardingCompleted ?? false,
          skills: profileData.skills || [],
          interests: profileData.interests || [],
        });
      }

      if (!profile) {
        console.error('[profile-update] Failed to create/update profile for user:', req.session.userId);
        return res.status(500).json({ error: "Failed to save profile" });
      }

      if (profileData.skills && profileData.skills.length > 0 && profile?.email) {
        const matchingIdeas = await storage.findIdeasBySkills(profileData.skills, req.session.userId);

        if (matchingIdeas.length > 0) {
          const { sendSkillMatchEmail } = await import('./email');
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
    } catch (error: any) {
      console.error('[profile-update] Error saving profile for user:', req.session?.userId);
      console.error('[profile-update] Error name:', error?.name);
      console.error('[profile-update] Error message:', error?.message);
      if (error?.code) console.error('[profile-update] PG code:', error.code);
      if (error?.detail) console.error('[profile-update] PG detail:', error.detail);
      res.status(500).json({ error: "Failed to save profile. Please try again." });
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

  // Upload and parse business plan document (PDF/DOCX)
  app.post("/api/documents/parse-business-plan", documentUpload.single("document"), async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      let extractedText = "";
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      if (mimeType === "application/pdf") {
        // Parse PDF
        const pdfParseModule = await import("pdf-parse");
        const pdfParse = pdfParseModule.default || pdfParseModule;
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text;
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        // Parse DOCX
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;
      }

      if (!extractedText || extractedText.trim().length < 50) {
        return res.status(400).json({ 
          error: "Could not extract enough text from the document. Please ensure it contains readable text." 
        });
      }

      // Clean up the extracted text
      extractedText = extractedText
        .replace(/\s+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      // Limit to reasonable size for AI processing
      if (extractedText.length > 50000) {
        extractedText = extractedText.substring(0, 50000) + "\n\n[Document truncated due to length...]";
      }

      res.json({ 
        success: true, 
        content: extractedText,
        fileName: req.file.originalname,
        fileSize: req.file.size
      });
    } catch (error) {
      console.error("Document parsing error:", error);
      res.status(500).json({ 
        error: "Failed to parse document. Please try a different file or format." 
      });
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
      const enriched = await Promise.all(advisors.map(async (advisor) => {
        const industries = await storage.getProfileIndustries(advisor.id);
        return { ...advisor, industries };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Fetch advisors error:", error);
      res.status(500).json({ error: "Failed to fetch advisors" });
    }
  });

  app.get("/api/ambassadors", async (_req: Request, res: Response) => {
    try {
      const ambassadors = await storage.getProfilesByYassuRole("ambassador");
      const enriched = await Promise.all(ambassadors.map(async (amb) => {
        const industries = await storage.getProfileIndustries(amb.id);
        return { ...amb, industries };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Fetch ambassadors error:", error);
      res.status(500).json({ error: "Failed to fetch ambassadors" });
    }
  });

  // Bruin team member names (shown in Bruin collaborators page)
  const BRUIN_TEAM_MEMBERS = [
    'bob battista',
    'kloey battista',
    'pauline teo',
    'hae yung kim',
    'ricardo',
    'mark wilson',
  ];

  // Collaborators marketplace - all users with filters
  app.get("/api/collaborators", async (req: Request, res: Response) => {
    try {
      const roles = req.query.roles ? (Array.isArray(req.query.roles) ? req.query.roles : [req.query.roles]) as string[] : undefined;
      const skills = req.query.skills ? (Array.isArray(req.query.skills) ? req.query.skills : [req.query.skills]) as string[] : undefined;
      const interests = req.query.interests ? (Array.isArray(req.query.interests) ? req.query.interests : [req.query.interests]) as string[] : undefined;
      const clubType = req.query.clubType as string | undefined;
      const search = req.query.search as string | undefined;
      const sessionBrand = req.session?.brand || null;
      const brandFilter = (req.query.brand as string | undefined) || sessionBrand;
      
      const collaborators = await storage.getCollaborators({
        roles,
        skills,
        interests,
        clubType,
        search,
      });

      let filtered = collaborators;
      if (brandFilter === 'bruin') {
        filtered = collaborators.filter(c => {
          const name = (c.fullName || '').toLowerCase().trim();
          return BRUIN_TEAM_MEMBERS.some(member => name.includes(member) || member.includes(name));
        });
      }

      const enriched = await Promise.all(filtered.map(async (collab) => {
        const industries = await storage.getProfileIndustries(collab.id);
        return { ...collab, industries };
      }));
      res.json(enriched);
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

  // Search users (authenticated)
  app.get("/api/users/search", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const query = String(req.query.q || '').toLowerCase().trim();
      if (!query) {
        return res.json([]);
      }
      
      const profiles = await db.select({
        id: schema.profiles.userId,
        fullName: schema.profiles.fullName,
        avatarUrl: schema.profiles.avatarUrl,
        skills: schema.profiles.skills,
        universityName: schema.universities.name,
      })
        .from(schema.profiles)
        .leftJoin(schema.universities, eq(schema.profiles.universityId, schema.universities.id))
        .where(
          or(
            sql`LOWER(${schema.profiles.fullName}) LIKE ${'%' + query + '%'}`,
            sql`LOWER(${schema.profiles.bio}) LIKE ${'%' + query + '%'}`
          )
        )
        .limit(20);
      
      const results = profiles.map(p => ({
        id: p.id,
        fullName: p.fullName,
        avatarUrl: p.avatarUrl,
        skills: p.skills || [],
        university: p.universityName,
      }));
      
      res.json(results);
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ error: "Failed to search users" });
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

  // Serve cover images from object storage
  app.get("/api/cover-images/:bucket/:folder/:filename", async (req: Request, res: Response) => {
    try {
      const bucketName = req.params.bucket;
      const fileName = `${req.params.folder}/${req.params.filename}`;
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(fileName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "image/png",
        "Cache-Control": "public, max-age=31536000",
      });
      
      file.createReadStream().pipe(res);
    } catch (error) {
      console.error("Error serving cover image:", error);
      res.status(500).json({ error: "Failed to serve image" });
    }
  });

  // Serve pitch deck files from object storage
  app.get("/api/pitch-deck-files/:bucket/:folder/:filename", async (req: Request, res: Response) => {
    try {
      const bucketName = req.params.bucket;
      const fileName = `${req.params.folder}/${req.params.filename}`;
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(fileName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ error: "File not found" });
      }
      
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/pdf",
        "Cache-Control": "public, max-age=31536000",
        "Content-Disposition": "inline",
      });
      
      file.createReadStream().pipe(res);
    } catch (error) {
      console.error("Error serving pitch deck file:", error);
      res.status(500).json({ error: "Failed to serve file" });
    }
  });

  app.get("/api/industries", async (_req: Request, res: Response) => {
    try {
      const industries = await storage.getIndustries();
      res.json(industries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch industries" });
    }
  });

  app.get("/api/ideas", async (req: Request, res: Response) => {
    try {
      const sessionBrand = req.session?.brand || null;
      const brandFilter = (req.query.brand as string | undefined) || sessionBrand;
      const ideas = await storage.getIdeasWithCreators();
      const filtered = brandFilter
        ? ideas.filter(idea => (idea as any).brand === brandFilter)
        : ideas.filter(idea => !(idea as any).brand);
      const ideasWithIndustries = await Promise.all(
        filtered.map(async (idea) => {
          const industries = await storage.getIdeaIndustries(idea.id);
          return { ...idea, industries };
        })
      );
      res.json(ideasWithIndustries);
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

  // Search ideas (public)
  app.get("/api/ideas/search", async (req: Request, res: Response) => {
    try {
      const query = String(req.query.q || '').toLowerCase().trim();
      const sessionBrand = req.session?.brand || null;
      const brandFilter = (req.query.brand as string | undefined) || sessionBrand;
      if (!query) {
        return res.json([]);
      }
      
      const allIdeas = await storage.getIdeasWithCreators();
      const brandFiltered = brandFilter
        ? allIdeas.filter(idea => (idea as any).brand === brandFilter)
        : allIdeas.filter(idea => !(idea as any).brand);
      const results = brandFiltered.filter(idea => 
        idea.title?.toLowerCase().includes(query) ||
        idea.problem?.toLowerCase().includes(query) ||
        idea.solution?.toLowerCase().includes(query)
      ).slice(0, 20);
      
      res.json(results);
    } catch (error) {
      console.error("Search ideas error:", error);
      res.status(500).json({ error: "Failed to search ideas" });
    }
  });

  // Get featured ideas for homepage (public)
  app.get("/api/ideas/featured", async (req: Request, res: Response) => {
    try {
      const brandFilter = req.query.brand as string | undefined;
      const allIdeas = await storage.getIdeasWithCreators();
      const brandFiltered = brandFilter
        ? allIdeas.filter(idea => (idea as any).brand === brandFilter)
        : allIdeas.filter(idea => !(idea as any).brand);
      const featuredIdeas = brandFiltered.filter(idea => idea.isPublic && idea.isFeatured);
      res.json(featuredIdeas);
    } catch (error) {
      console.error("Error fetching featured ideas:", error);
      res.status(500).json({ error: "Failed to fetch featured ideas" });
    }
  });

  // Toggle idea featured status (admin only)
  app.patch("/api/admin/ideas/:id/featured", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Check if user is admin
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { isFeatured } = req.body;

      // First, get the idea to check if it needs a cover image
      const idea = await storage.getIdea(id);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      let coverImage = idea.coverImage;

      // If featuring the idea and it doesn't have a cover image, try to generate one
      if (isFeatured && !coverImage) {
        console.log(`Generating cover image for idea: ${idea.title}`);
        try {
          coverImage = await generateIdeaCoverImage(id, idea.title, idea.problem);
        } catch (imgError) {
          console.error(`Failed to generate cover image for ${idea.title}:`, imgError);
          // Continue without cover image - don't block featuring
        }
      }

      // Update the idea's featured status and cover image
      const [updated] = await db
        .update(schema.ideas)
        .set({ 
          isFeatured: isFeatured,
          ...(coverImage && { coverImage })
        })
        .where(eq(schema.ideas.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Idea not found" });
      }

      res.json({ success: true, idea: updated });
    } catch (error) {
      console.error("Error toggling featured status:", error);
      res.status(500).json({ error: "Failed to update featured status" });
    }
  });

  // Regenerate cover images for all featured ideas without images (admin only)
  app.post("/api/admin/ideas/classify-industries", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const allIdeas = await storage.getIdeasWithCreators();
      let classified = 0;
      const allIndustries = await storage.getIndustries();

      for (const idea of allIdeas) {
        const existing = await storage.getIdeaIndustries(idea.id);
        if (existing.length > 0) continue;

        const industryNames = await classifyIdeaIndustries(idea.title, idea.problem, idea.solution);
        if (industryNames.length > 0) {
          const matchedIds = allIndustries
            .filter(ind => industryNames.includes(ind.name))
            .map(ind => ind.id);
          if (matchedIds.length > 0) {
            await storage.addIdeaIndustries(idea.id, matchedIds);
            classified++;
            console.log(`[Industry Backfill] "${idea.title}" -> ${industryNames.join(', ')}`);
          }
        }
      }

      res.json({ message: `Classified ${classified} ideas into industries`, total: allIdeas.length });
    } catch (error: any) {
      console.error("Industry classification backfill error:", error);
      res.status(500).json({ error: "Failed to classify ideas" });
    }
  });

  app.post("/api/admin/ideas/regenerate-covers", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Find all featured ideas - regenerate all of them
      const featuredIdeas = await db
        .select()
        .from(schema.ideas)
        .where(eq(schema.ideas.isFeatured, true));

      // Regenerate ALL featured ideas (not just ones without images)
      const ideasNeedingImages = featuredIdeas;
      console.log(`[CoverImage] Found ${ideasNeedingImages.length} featured ideas, regenerating all cover images`);

      const results = [];
      for (const idea of ideasNeedingImages) {
        console.log(`[CoverImage] Generating for: ${idea.title}`);
        try {
          const coverImage = await generateIdeaCoverImage(idea.id, idea.title, idea.problem);
          
          if (coverImage) {
            await db
              .update(schema.ideas)
              .set({ coverImage })
              .where(eq(schema.ideas.id, idea.id));
            results.push({ id: idea.id, title: idea.title, success: true, coverImage });
          } else {
            results.push({ id: idea.id, title: idea.title, success: false, error: "No image returned" });
          }
        } catch (genError: any) {
          console.error(`[CoverImage] Error for ${idea.title}:`, genError);
          results.push({ id: idea.id, title: idea.title, success: false, error: genError.message });
        }
      }

      res.json({ 
        message: `Processed ${ideasNeedingImages.length} ideas`,
        results 
      });
    } catch (error: any) {
      console.error("Error regenerating cover images:", error);
      res.status(500).json({ error: "Failed to regenerate cover images" });
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
      
      // Security: Check access for private ideas
      if (!idea.isPublic) {
        if (!req.session.userId) {
          return res.status(401).json({ error: "Authentication required to view this idea" });
        }
        
        const isOwner = idea.createdBy === req.session.userId;
        let isTeamMember = false;
        
        // Check if user is a team member
        if (!isOwner) {
          const teams = await pool.query(
            `SELECT t.id FROM teams t 
             JOIN team_members tm ON t.id = tm.team_id 
             WHERE t.idea_id = $1 AND tm.user_id = $2`,
            [idea.id, req.session.userId]
          );
          isTeamMember = teams.rows.length > 0;
        }
        
        if (!isOwner && !isTeamMember) {
          return res.status(403).json({ error: "You don't have permission to view this idea" });
        }
      }
      
      const [tags, industries] = await Promise.all([
        storage.getIdeaTags(req.params.id),
        storage.getIdeaIndustries(req.params.id),
      ]);
      res.json({ ...idea, tags: tags.map(t => t.tag), industries });
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
        error: "Failed to refine idea. Please try again."
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
        error: 'Failed to generate matches'
      });
    }
  });

  // AI Improve Idea endpoint
  app.post("/api/ideas/improve", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { problem, solution, targetUser, whyNow } = req.body;
      
      if (!problem) {
        return res.status(400).json({ error: "Problem statement is required" });
      }

      const prompt = `You are an expert startup advisor helping founders refine their startup ideas for clarity and investor appeal.

CURRENT IDEA INPUT:
- Problem Statement: ${problem}
${solution ? `- Proposed Solution: ${solution}` : ''}
${targetUser ? `- Target User: ${targetUser}` : ''}
${whyNow ? `- Why Now: ${whyNow}` : ''}

CRITICAL INSTRUCTIONS - Each field must be DISTINCT and DIFFERENT:

1. **PROBLEM** (2-3 sentences max): Describe ONLY the pain point, challenge, or gap in the market. 
   - Focus on WHO is suffering and WHAT they struggle with
   - Include a specific metric or statistic if possible (e.g., "X% of authors fail to...")
   - DO NOT mention your solution here - only describe the problem
   - Example: "Self-published authors struggle to gain visibility on Amazon KDP, with over 80% of books selling fewer than 100 copies. Most lack the marketing expertise and design skills needed to compete with traditionally published titles."

2. **SOLUTION** (2-3 sentences max): Describe ONLY your product/service and HOW it solves the problem.
   - Focus on WHAT you're building and HOW it works
   - Be specific about the key features or approach
   - DO NOT repeat the problem here - only describe your solution
   - Example: "Authors Bureau is an AI-powered platform that handles the entire publishing journey - from manuscript formatting and cover design to category optimization and marketing automation. Our algorithms identify high-potential niches and craft personalized launch strategies."

3. **TARGET USER** (1-2 sentences): Describe WHO specifically will use this.
   - Be specific: demographics, behaviors, current alternatives they use

4. **WHY NOW** (1-2 sentences): Explain the timing opportunity.
   - What recent trends, technologies, or market changes make this the right time?

IMPORTANT: The Problem and Solution MUST be completely different content. Problem = the pain/struggle. Solution = your product/features.

Return valid JSON:
{
  "problem": "clear problem statement focusing on the pain point only - no mention of solution",
  "solution": "clear solution statement describing your product/service - different from problem",
  "targetUser": "specific target user description",
  "whyNow": "timing explanation"
}`;

      const OpenAI = (await import('openai')).default;
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);
      const openai = new OpenAI({ apiKey, baseURL });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert startup advisor. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const improved = JSON.parse(responseText);

      res.json({
        problem: improved.problem || null,
        solution: improved.solution || null,
        targetUser: improved.targetUser || null,
        whyNow: improved.whyNow || null,
      });
    } catch (error) {
      console.error("Improve idea error:", error);
      res.status(500).json({ 
        error: 'Failed to improve idea'
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
        brand: req.session.brand || null,
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
      
      // AI-classify the idea into industries (non-blocking)
      classifyIdeaIndustries(ideaData.title, ideaData.problem, ideaData.solution)
        .then(async (industryNames) => {
          if (industryNames.length > 0) {
            const allIndustries = await storage.getIndustries();
            const matchedIds = allIndustries
              .filter(ind => industryNames.includes(ind.name))
              .map(ind => ind.id);
            if (matchedIds.length > 0) {
              await storage.addIdeaIndustries(idea.id, matchedIds);
              console.log(`[Industry] Classified idea "${idea.title}" into: ${industryNames.join(', ')}`);
            }
          }
        })
        .catch(err => console.error("Industry classification failed:", err));
      
      // Send confirmation email to the idea creator (if notifications enabled)
      const creator = await storage.getProfile(req.session.userId);
      if (creator?.email && creator?.emailNotificationsEnabled !== false) {
        const { sendIdeaCreatedEmail } = await import('./email');
        sendIdeaCreatedEmail(
          creator.email,
          creator.fullName || 'Founder',
          idea.title,
          idea.id
        ).catch(err => {
          console.error('Failed to send idea created email:', err);
        });
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
      
      // Update idea stage to build_mvp when MVP link is added
      if (mvpLink) {
        await updateIdeaStageIfHigher(req.params.id, 'build_mvp');
      }
      
      res.json(updatedIdea);
    } catch (error) {
      console.error("Save MVP link error:", error);
      res.status(500).json({ error: "Failed to save MVP link" });
    }
  });

  // Get pitch deck for an idea
  app.get("/api/ideas/:id/pitch-deck", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Authorization check - verify user owns or is a team member of the idea
      const idea = await storage.getIdea(req.params.id);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }
      
      if (idea.createdBy !== req.session.userId) {
        // Check if user is a team member
        const teams = await db.select()
          .from(schema.teams)
          .where(eq(schema.teams.ideaId, req.params.id))
          .limit(1);
        
        let isTeamMember = false;
        if (teams.length > 0) {
          const teamMembers = await db.select()
            .from(schema.teamMembers)
            .where(eq(schema.teamMembers.teamId, teams[0].id));
          isTeamMember = teamMembers.some((m: any) => m.userId === req.session.userId);
        }
        
        if (!isTeamMember) {
          return res.status(403).json({ error: "Not authorized to access this pitch deck" });
        }
      }
      
      const deck = await storage.getPitchDeck(req.params.id);
      if (!deck) {
        return res.json({ deck: null });
      }
      
      // Parse the JSON fields
      res.json({
        deck: {
          ...deck,
          slides: JSON.parse(deck.slides || '[]'),
          metricsValidation: deck.metricsValidation ? JSON.parse(deck.metricsValidation) : null,
        }
      });
    } catch (error) {
      console.error("Get pitch deck error:", error);
      res.status(500).json({ error: "Failed to get pitch deck" });
    }
  });

  // Save pitch deck for an idea
  app.post("/api/ideas/:id/pitch-deck", async (req: Request, res: Response) => {
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

      const { investorMode, deckType, targetRaise, slides, metricsValidation } = req.body;
      
      const deck = await storage.savePitchDeck({
        ideaId: req.params.id,
        investorMode,
        deckType,
        targetRaise,
        slides: JSON.stringify(slides),
        metricsValidation: metricsValidation ? JSON.stringify(metricsValidation) : undefined,
      });
      
      // Update idea stage to yassu_foundry when pitch deck is created
      await updateIdeaStageIfHigher(req.params.id, 'yassu_foundry');
      
      // Return with parsed JSON fields for consistency
      res.json({ 
        deck: {
          ...deck,
          slides: JSON.parse(deck.slides || '[]'),
          metricsValidation: deck.metricsValidation ? JSON.parse(deck.metricsValidation) : null,
        }
      });
    } catch (error) {
      console.error("Save pitch deck error:", error);
      res.status(500).json({ error: "Failed to save pitch deck" });
    }
  });

  // Update pitch deck (e.g., add final deck URL)
  app.patch("/api/ideas/:id/pitch-deck", async (req: Request, res: Response) => {
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

      const { finalDeckUrl, slides, metricsValidation } = req.body;
      const updateData: any = {};
      
      if (finalDeckUrl !== undefined) updateData.finalDeckUrl = finalDeckUrl;
      if (slides !== undefined) updateData.slides = JSON.stringify(slides);
      if (metricsValidation !== undefined) updateData.metricsValidation = JSON.stringify(metricsValidation);
      
      const deck = await storage.updatePitchDeck(req.params.id, updateData);
      if (!deck) {
        return res.status(404).json({ error: "Pitch deck not found" });
      }
      
      // Return with parsed JSON fields for consistency
      res.json({ 
        deck: {
          ...deck,
          slides: JSON.parse(deck.slides || '[]'),
          metricsValidation: deck.metricsValidation ? JSON.parse(deck.metricsValidation) : null,
        }
      });
    } catch (error) {
      console.error("Update pitch deck error:", error);
      res.status(500).json({ error: "Failed to update pitch deck" });
    }
  });

  // Upload pitch deck slides (PDF/PPTX)
  app.post("/api/ideas/:id/pitch-deck/upload", documentUpload.single("slides"), async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const idea = await storage.getIdea(req.params.id);
      if (!idea || idea.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Upload to object storage
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        return res.status(500).json({ error: "Object storage not configured" });
      }

      const ext = req.file.originalname.split('.').pop() || 'pdf';
      const fileName = `pitch-decks/${req.params.id}-${Date.now()}.${ext}`;
      const bucket = objectStorageClient.bucket(bucketId);
      const file = bucket.file(fileName);

      console.log(`[PitchDeck] Uploading slides to ${fileName}...`);
      await file.save(req.file.buffer, {
        contentType: req.file.mimetype,
        metadata: {
          cacheControl: "public, max-age=31536000",
        },
      });

      // Return the internal path (will be served via object storage API)
      const fileUrl = `/api/pitch-deck-files/${bucketId}/${fileName}`;
      console.log(`[PitchDeck] Upload complete: ${fileUrl}`);
      
      // Update the pitch deck with the uploaded file URL
      const deck = await storage.updatePitchDeck(req.params.id, { 
        finalDeckUrl: fileUrl 
      });

      if (!deck) {
        // If no pitch deck exists yet, create a minimal one
        await storage.savePitchDeck({
          ideaId: req.params.id,
          investorMode: "angel",
          deckType: "full",
          slides: "[]",
          finalDeckUrl: fileUrl,
        });
      }

      res.json({ 
        success: true, 
        fileUrl,
        message: "Slides uploaded successfully" 
      });
    } catch (error) {
      console.error("Upload pitch deck slides error:", error);
      res.status(500).json({ error: "Failed to upload slides" });
    }
  });

  // Remove uploaded pitch deck file
  app.delete("/api/ideas/:id/pitch-deck/remove-file", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const idea = await storage.getIdea(req.params.id);
      if (!idea || idea.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Get the current pitch deck to find the file URL
      const deck = await storage.getPitchDeck(req.params.id);
      if (deck?.finalDeckUrl) {
        // Try to delete from object storage
        try {
          const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
          if (bucketId) {
            // Extract the file path from the URL
            const urlMatch = deck.finalDeckUrl.match(/pitch-decks\/(.+)$/);
            if (urlMatch) {
              const fileName = `pitch-decks/${urlMatch[1]}`;
              const bucket = objectStorageClient.bucket(bucketId);
              const file = bucket.file(fileName);
              await file.delete().catch(() => {
                console.log("File may not exist or already deleted");
              });
            }
          }
        } catch (e) {
          console.log("Could not delete file from storage:", e);
        }
      }

      // Update the pitch deck to remove the file URL
      await storage.updatePitchDeck(req.params.id, { finalDeckUrl: null });

      res.json({ success: true, message: "Deck file removed" });
    } catch (error) {
      console.error("Remove pitch deck file error:", error);
      res.status(500).json({ error: "Failed to remove deck file" });
    }
  });

  // Get pitch preparation for an idea
  app.get("/api/ideas/:id/pitch-preparation", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const idea = await storage.getIdea(req.params.id);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      // Check authorization: must be owner or team member
      if (idea.createdBy !== req.session.userId) {
        const teams = await db.select()
          .from(schema.teams)
          .where(eq(schema.teams.ideaId, req.params.id))
          .limit(1);
        
        let isTeamMember = false;
        if (teams.length > 0) {
          const teamMembers = await db.select()
            .from(schema.teamMembers)
            .where(eq(schema.teamMembers.teamId, teams[0].id));
          isTeamMember = teamMembers.some((m: any) => m.userId === req.session.userId);
        }
        
        if (!isTeamMember) {
          return res.status(403).json({ error: "Not authorized to access this pitch preparation" });
        }
      }
      
      const prep = await storage.getPitchPreparation(req.params.id);
      if (!prep) {
        return res.json({ preparation: null });
      }
      
      res.json({
        preparation: {
          ...prep,
          deliveryScripts: JSON.parse(prep.deliveryScripts || '[]'),
          objections: prep.objections ? JSON.parse(prep.objections) : null,
          rehearsalQuestions: prep.rehearsalQuestions ? JSON.parse(prep.rehearsalQuestions) : null,
        }
      });
    } catch (error) {
      console.error("Get pitch preparation error:", error);
      res.status(500).json({ error: "Failed to get pitch preparation" });
    }
  });

  // Save pitch preparation for an idea
  app.post("/api/ideas/:id/pitch-preparation", async (req: Request, res: Response) => {
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

      const { investorMode, deliveryScripts, objections, rehearsalQuestions } = req.body;
      
      const prep = await storage.savePitchPreparation({
        ideaId: req.params.id,
        investorMode,
        deliveryScripts: JSON.stringify(deliveryScripts),
        objections: objections ? JSON.stringify(objections) : undefined,
        rehearsalQuestions: rehearsalQuestions ? JSON.stringify(rehearsalQuestions) : undefined,
      });
      
      res.json({ 
        preparation: {
          ...prep,
          deliveryScripts: JSON.parse(prep.deliveryScripts || '[]'),
          objections: prep.objections ? JSON.parse(prep.objections) : null,
          rehearsalQuestions: prep.rehearsalQuestions ? JSON.parse(prep.rehearsalQuestions) : null,
        }
      });
    } catch (error) {
      console.error("Save pitch preparation error:", error);
      res.status(500).json({ error: "Failed to save pitch preparation" });
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
      
      // Notify the idea owner about the new join request
      const idea = await storage.getIdea(ideaId);
      const applicant = await storage.getProfile(req.session.userId);
      if (idea && applicant) {
        await storage.createNotification({
          userId: idea.createdBy,
          type: 'join_request',
          title: 'New Join Request',
          message: `${applicant.fullName || 'Someone'} wants to join your project "${idea.title}"`,
          link: `/portal/ideas/${ideaId}`,
        });
      }
      
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
      const { status, customMessage } = req.body;
      if (!["accepted", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const updated = await storage.updateJoinRequest(req.params.id, { status });
      
      if (updated) {
        console.log(`[Join Request] Processing status update to ${status} for request ${req.params.id}`);
        
        // Get applicant and idea owner info
        if (!updated.ideaId) {
          console.error('[Join Request] No ideaId on join request');
        }
        
        const [applicant, idea] = await Promise.all([
          storage.getProfile(updated.userId),
          updated.ideaId ? storage.getIdea(updated.ideaId) : null
        ]);
        
        const ideaOwner = idea ? await storage.getProfile(idea.createdBy) : null;
        
        console.log(`[Join Request] Applicant email: ${applicant?.email}, Idea: ${idea?.title}, Owner: ${ideaOwner?.fullName}`);
        
        if (applicant?.email && idea && ideaOwner) {
          const { sendRequestAcceptedEmail, sendRequestRejectedEmail, sendRequestPendingEmail } = await import('./email');
          
          if (status === 'accepted') {
            // Add user to the team when request is accepted
            try {
              // Find the team for this idea
              const teams = await db.select().from(schema.teams).where(eq(schema.teams.ideaId, idea.id));
              if (teams.length > 0) {
                const team = teams[0];
                // Check if user is already a team member
                const existingMember = await db.select().from(schema.teamMembers)
                  .where(and(
                    eq(schema.teamMembers.teamId, team.id),
                    eq(schema.teamMembers.userId, updated.userId)
                  ));
                
                if (existingMember.length === 0) {
                  // Add user to team
                  await db.insert(schema.teamMembers).values({
                    teamId: team.id,
                    userId: updated.userId,
                    role: updated.role || 'member',
                  });
                  console.log(`[Join Request] Added user ${updated.userId} to team ${team.id}`);
                }
              } else {
                console.error(`[Join Request] No team found for idea ${idea.id}`);
              }
            } catch (teamErr) {
              console.error('[Join Request] Failed to add user to team:', teamErr);
            }
            
            // Update idea stage to form_team when someone joins
            if (updated.ideaId) {
              updateIdeaStageIfHigher(updated.ideaId, 'form_team').catch(err => {
                console.error('Failed to update idea stage:', err);
              });
            }
            
            // Create notification for the applicant
            await storage.createNotification({
              userId: updated.userId,
              type: 'request_accepted',
              title: 'Request Accepted!',
              message: `Your request to join "${idea.title}" has been accepted`,
              link: `/portal/ideas/${idea.id}`,
            });
            
            console.log(`[Join Request] Sending acceptance email to ${applicant.email}, ideaId: ${idea.id}`);
            sendRequestAcceptedEmail(
              applicant.email,
              applicant.fullName || 'there',
              ideaOwner.fullName || 'The project owner',
              idea.title,
              idea.id,
              customMessage
            ).catch(err => {
              console.error('Failed to send request accepted email:', err);
            });
          } else if (status === 'rejected') {
            // Create notification for the applicant
            await storage.createNotification({
              userId: updated.userId,
              type: 'request_rejected',
              title: 'Request Update',
              message: `Your request to join "${idea.title}" was not approved at this time`,
              link: '/portal/ideas',
            });
            
            console.log(`[Join Request] Sending rejection email to ${applicant.email}`);
            sendRequestRejectedEmail(
              applicant.email,
              applicant.fullName || 'there',
              ideaOwner.fullName || 'The project owner',
              idea.title,
              customMessage
            ).catch(err => {
              console.error('Failed to send request rejected email:', err);
            });
          } else if (status === 'pending' && customMessage) {
            // Only send pending email if there's a custom message
            console.log(`[Join Request] Sending pending email to ${applicant.email}`);
            sendRequestPendingEmail(
              applicant.email,
              applicant.fullName || 'there',
              ideaOwner.fullName || 'The project owner',
              idea.title,
              customMessage
            ).catch(err => {
              console.error('Failed to send request pending email:', err);
            });
          }
        } else {
          console.error(`[Join Request] Missing data for email: applicant=${!!applicant?.email}, idea=${!!idea}, owner=${!!ideaOwner}`);
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
        // Create notification for the invitee
        await storage.createNotification({
          userId: inviteeId,
          type: 'team_invite',
          title: 'Team Invitation',
          message: `${inviter.fullName || 'Someone'} invited you to join "${idea.title}"`,
          link: `/portal/ideas/${ideaId}`,
        });
        
        const { sendTeamInvitationEmail, sendAdvisorRequestSentEmail } = await import('./email');
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
        
        // Send confirmation email to the inviter (sender) if notifications enabled
        if (inviter.email && inviter.emailNotificationsEnabled !== false && (role === 'advisor' || message?.toLowerCase().includes('advisor'))) {
          sendAdvisorRequestSentEmail(
            inviter.email,
            inviter.fullName || 'there',
            invitee.fullName || 'the advisor',
            idea.title
          ).catch(err => {
            console.error('Failed to send advisor request confirmation email:', err);
          });
        }
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
        // Update idea stage to form_team when someone accepts invite
        updateIdeaStageIfHigher(invite.ideaId, 'form_team').catch(err => {
          console.error('Failed to update idea stage:', err);
        });
        
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

  app.get("/api/admin/email-logs", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = (page - 1) * limit;
      const typeFilter = req.query.type as string || '';
      const statusFilter = req.query.status as string || '';
      const search = req.query.search as string || '';

      let whereClause = sql`1=1`;
      if (typeFilter) whereClause = sql`${whereClause} AND email_type = ${typeFilter}`;
      if (statusFilter) whereClause = sql`${whereClause} AND status = ${statusFilter}`;
      if (search) whereClause = sql`${whereClause} AND (recipient ILIKE ${'%' + search + '%'} OR subject ILIKE ${'%' + search + '%'})`;

      const [countResult, logs] = await Promise.all([
        db.execute(sql`SELECT COUNT(*) as total FROM email_logs WHERE ${whereClause}`),
        db.execute(sql`SELECT * FROM email_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`),
      ]);

      const total = Number((countResult.rows[0] as any)?.total || 0);

      const typeCounts = await db.execute(sql`
        SELECT email_type, COUNT(*) as count FROM email_logs GROUP BY email_type ORDER BY count DESC
      `);

      res.json({
        logs: logs.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        typeCounts: typeCounts.rows,
      });
    } catch (error) {
      console.error("Email logs error:", error);
      res.status(500).json({ error: "Failed to fetch email logs" });
    }
  });

  app.get("/api/admin/email-logs/:id/html", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

      const emailId = parseInt(req.params.id);
      if (isNaN(emailId)) return res.status(400).json({ error: "Invalid email ID" });
      const result = await db.execute(sql`SELECT html_body FROM email_logs WHERE id = ${emailId}`);
      const row = result.rows[0] as any;
      if (!row) return res.status(404).json({ error: "Email not found" });
      if (!row.html_body) return res.status(404).json({ error: "Email body not available" });

      res.json({ html: row.html_body });
    } catch (error) {
      console.error("Email HTML fetch error:", error);
      res.status(500).json({ error: "Failed to fetch email HTML" });
    }
  });

  // Analytics dashboard (admin only)
  app.get("/api/admin/analytics", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const rawFrom = req.query.from as string | undefined;
      const rawTo = req.query.to as string | undefined;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const fromDate = rawFrom && dateRegex.test(rawFrom) && !isNaN(Date.parse(rawFrom)) ? rawFrom : undefined;
      const toDate = rawTo && dateRegex.test(rawTo) && !isNaN(Date.parse(rawTo)) ? rawTo : undefined;
      const hasDateFilter = !!(fromDate || toDate);

      function dateWhere(col: string, startIdx = 1): { clause: string; params: any[] } {
        if (!hasDateFilter) return { clause: '', params: [] };
        const parts: string[] = [];
        const params: any[] = [];
        if (fromDate) {
          params.push(fromDate);
          parts.push(`${col} >= $${startIdx + params.length - 1}::date`);
        }
        if (toDate) {
          params.push(toDate);
          parts.push(`${col} < ($${startIdx + params.length - 1}::date + INTERVAL '1 day')`);
        }
        return { clause: parts.join(' AND '), params };
      }

      const d = dateWhere('created_at');
      const dWhere = d.clause ? ` WHERE ${d.clause}` : '';
      const dAnd = d.clause ? ` AND ${d.clause}` : '';
      const dP = d.params;

      const di = dateWhere('i.created_at');
      const diAnd = di.clause ? ` AND ${di.clause}` : '';

      const dt = dateWhere('t.created_at');
      const dtAnd = dt.clause ? ` AND ${dt.clause}` : '';

      const du = dateWhere('u.created_at');
      const duWhere = du.clause ? ` WHERE ${du.clause}` : '';

      const dus = dateWhere('us.created_at');
      const dusAnd = dus.clause ? ` AND ${dus.clause}` : '';

      const growthClause = hasDateFilter && d.clause
        ? `WHERE ${d.clause}`
        : `WHERE created_at >= NOW() - INTERVAL '12 weeks'`;
      const growthParams = hasDateFilter ? dP : [];

      const [
        usersResult,
        ideasResult,
        teamsResult,
        teamMembersResult,
        businessPlansResult,
        pitchDecksResult,
        connectionsResult,
        messagesResult,
        ideaStagesResult,
        brandBreakdownResult,
        userGrowthResult,
        ideaGrowthResult,
        teamGrowthResult,
        usersByUniversityResult,
        usersByRoleResult,
        recentUsersResult,
        recentIdeasResult,
        recentTeamsResult,
        joinRequestsResult,
        teamInvitesResult,
      ] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7, COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30 FROM users${dWhere}`, dP),
        pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN is_public = true THEN 1 END) as public_count, COUNT(CASE WHEN is_public = false THEN 1 END) as private_count FROM ideas${dWhere}`, dP),
        pool.query(`SELECT COUNT(*) as total FROM teams${dWhere}`, dP),
        pool.query(`SELECT COUNT(*) as total FROM team_members`),
        pool.query(`SELECT COUNT(*) as total FROM workflow_runs WHERE workflow_type = 'business_plan'${dAnd}`, dP),
        pool.query(`SELECT COUNT(*) as total FROM pitch_decks${dWhere}`, dP),
        pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted, COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending FROM connections${dWhere}`, dP).catch(() => ({ rows: [{ total: 0, accepted: 0, pending: 0 }] })),
        pool.query(`SELECT COUNT(*) as total FROM direct_messages${dWhere}`, dP).catch(() => ({ rows: [{ total: 0 }] })),
        pool.query(`SELECT stage, COUNT(*) as count FROM ideas${dWhere} GROUP BY stage ORDER BY CASE stage WHEN 'idea_posted' THEN 1 WHEN 'business_plan' THEN 2 WHEN 'find_advisors' THEN 3 WHEN 'form_team' THEN 4 WHEN 'build_mvp' THEN 5 WHEN 'yassu_foundry' THEN 6 WHEN 'launched' THEN 7 ELSE 8 END`, dP),
        pool.query(`SELECT COALESCE(brand, 'yassu') as brand_name, COUNT(*) as count FROM ideas${dWhere} GROUP BY COALESCE(brand, 'yassu')`, dP),
        pool.query(`SELECT DATE_TRUNC('week', created_at)::date as week, COUNT(*) as count FROM users ${growthClause} GROUP BY week ORDER BY week`, growthParams),
        pool.query(`SELECT DATE_TRUNC('week', created_at)::date as week, COUNT(*) as count FROM ideas ${growthClause} GROUP BY week ORDER BY week`, growthParams),
        pool.query(`SELECT DATE_TRUNC('week', created_at)::date as week, COUNT(*) as count FROM teams ${growthClause} GROUP BY week ORDER BY week`, growthParams),
        pool.query(`SELECT u.name as university, COUNT(p.id) as count FROM profiles p LEFT JOIN universities u ON p.university_id = u.id LEFT JOIN users us ON us.id = p.user_id WHERE u.name IS NOT NULL${dusAnd} GROUP BY u.name ORDER BY count DESC LIMIT 10`, dus.params),
        pool.query(`SELECT role, COUNT(*) as count FROM user_roles GROUP BY role ORDER BY count DESC`),
        pool.query(`SELECT u.id, u.full_name, u.email, u.created_at FROM users u${duWhere} ORDER BY u.created_at DESC LIMIT 10`, du.params),
        pool.query(`SELECT i.id, i.title, i.stage, i.is_public, i.brand, i.created_at, u.full_name as creator_name FROM ideas i LEFT JOIN users u ON i.created_by = u.id WHERE 1=1${diAnd} ORDER BY i.created_at DESC LIMIT 10`, di.params),
        pool.query(`SELECT t.id, t.name, t.created_at, u.full_name as creator_name, COUNT(tm.id) as member_count FROM teams t LEFT JOIN users u ON t.created_by = u.id LEFT JOIN team_members tm ON tm.team_id = t.id WHERE 1=1${dtAnd} GROUP BY t.id, t.name, t.created_at, u.full_name ORDER BY t.created_at DESC LIMIT 10`, dt.params),
        pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending, COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted FROM join_requests${dWhere}`, dP),
        pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending, COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted FROM team_invites${dWhere}`, dP),
      ]);

      res.json({
        kpis: {
          totalUsers: Number(usersResult.rows[0].total),
          usersLast7Days: Number(usersResult.rows[0].last_7),
          usersLast30Days: Number(usersResult.rows[0].last_30),
          totalIdeas: Number(ideasResult.rows[0].total),
          publicIdeas: Number(ideasResult.rows[0].public_count),
          privateIdeas: Number(ideasResult.rows[0].private_count),
          totalTeams: Number(teamsResult.rows[0].total),
          totalTeamMembers: Number(teamMembersResult.rows[0].total),
          businessPlansGenerated: Number(businessPlansResult.rows[0].total),
          pitchDecksGenerated: Number(pitchDecksResult.rows[0].total),
          totalConnections: Number(connectionsResult.rows[0].total),
          acceptedConnections: Number(connectionsResult.rows[0].accepted),
          pendingConnections: Number(connectionsResult.rows[0].pending),
          totalMessages: Number(messagesResult.rows[0].total),
          joinRequests: {
            total: Number(joinRequestsResult.rows[0].total),
            pending: Number(joinRequestsResult.rows[0].pending),
            accepted: Number(joinRequestsResult.rows[0].accepted),
          },
          teamInvites: {
            total: Number(teamInvitesResult.rows[0].total),
            pending: Number(teamInvitesResult.rows[0].pending),
            accepted: Number(teamInvitesResult.rows[0].accepted),
          },
        },
        ideaStages: ideaStagesResult.rows.map((r: any) => ({
          stage: r.stage || 'unknown',
          count: Number(r.count),
        })),
        brandBreakdown: brandBreakdownResult.rows.map((r: any) => ({
          brand: r.brand_name,
          count: Number(r.count),
        })),
        userGrowth: userGrowthResult.rows.map((r: any) => ({
          week: r.week,
          count: Number(r.count),
        })),
        ideaGrowth: ideaGrowthResult.rows.map((r: any) => ({
          week: r.week,
          count: Number(r.count),
        })),
        teamGrowth: teamGrowthResult.rows.map((r: any) => ({
          week: r.week,
          count: Number(r.count),
        })),
        usersByUniversity: usersByUniversityResult.rows.map((r: any) => ({
          university: r.university,
          count: Number(r.count),
        })),
        usersByRole: usersByRoleResult.rows.map((r: any) => ({
          role: r.role,
          count: Number(r.count),
        })),
        recentUsers: recentUsersResult.rows,
        recentIdeas: recentIdeasResult.rows,
        recentTeams: recentTeamsResult.rows,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Analytics drill-down (admin only)
  app.get("/api/admin/analytics/drilldown", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const category = req.query.category as string;
    const filter = req.query.filter as string | undefined;

    try {
      let result;

      switch (category) {
        case 'users':
          result = await pool.query(`SELECT u.id, u.full_name, u.email, u.created_at, p.university_id, univ.name as university_name, p.skills, p.club_type FROM users u LEFT JOIN profiles p ON p.user_id = u.id LEFT JOIN universities univ ON p.university_id = univ.id ORDER BY u.created_at DESC`);
          break;
        case 'ideas':
          result = filter
            ? await pool.query(`SELECT i.id, i.title, i.stage, i.is_public, i.brand, i.created_at, u.full_name as creator_name FROM ideas i LEFT JOIN users u ON i.created_by = u.id WHERE i.stage = $1 ORDER BY i.created_at DESC`, [filter])
            : await pool.query(`SELECT i.id, i.title, i.stage, i.is_public, i.brand, i.created_at, u.full_name as creator_name FROM ideas i LEFT JOIN users u ON i.created_by = u.id ORDER BY i.created_at DESC`);
          break;
        case 'teams':
          result = await pool.query(`SELECT t.id, t.name, t.description, t.created_at, u.full_name as creator_name, COUNT(tm.id) as member_count FROM teams t LEFT JOIN users u ON t.created_by = u.id LEFT JOIN team_members tm ON tm.team_id = t.id GROUP BY t.id, t.name, t.description, t.created_at, u.full_name ORDER BY t.created_at DESC`);
          break;
        case 'business_plans':
          result = await pool.query(`SELECT wr.id, wr.workflow_type, wr.status, wr.created_at, i.title as idea_title, u.full_name as user_name FROM workflow_runs wr LEFT JOIN ideas i ON wr.idea_id = i.id LEFT JOIN users u ON wr.user_id = u.id WHERE wr.workflow_type = 'business_plan' ORDER BY wr.created_at DESC`);
          break;
        case 'pitch_decks':
          result = await pool.query(`SELECT pd.id, pd.investor_mode, pd.deck_type, pd.target_raise, pd.version, pd.created_at, i.title as idea_title FROM pitch_decks pd LEFT JOIN ideas i ON pd.idea_id = i.id ORDER BY pd.created_at DESC`);
          break;
        case 'connections':
          result = await pool.query(`SELECT c.id, c.status, c.created_at, u1.full_name as from_user, u2.full_name as to_user FROM connections c LEFT JOIN users u1 ON c.requester_id = u1.id LEFT JOIN users u2 ON c.recipient_id = u2.id ORDER BY c.created_at DESC`);
          break;
        case 'university':
          result = filter
            ? await pool.query(`SELECT u.id, u.full_name, u.email, u.created_at, univ.name as university_name FROM users u LEFT JOIN profiles p ON p.user_id = u.id LEFT JOIN universities univ ON p.university_id = univ.id WHERE univ.name = $1 ORDER BY u.created_at DESC`, [filter])
            : await pool.query(`SELECT u.id, u.full_name, u.email, u.created_at, univ.name as university_name FROM users u LEFT JOIN profiles p ON p.user_id = u.id LEFT JOIN universities univ ON p.university_id = univ.id ORDER BY u.created_at DESC`);
          break;
        case 'brand':
          result = filter
            ? await pool.query(`SELECT i.id, i.title, i.stage, i.created_at, u.full_name as creator_name, COALESCE(i.brand, 'yassu') as brand FROM ideas i LEFT JOIN users u ON i.created_by = u.id WHERE COALESCE(i.brand, 'yassu') = $1 ORDER BY i.created_at DESC`, [filter])
            : await pool.query(`SELECT i.id, i.title, i.stage, i.created_at, u.full_name as creator_name, COALESCE(i.brand, 'yassu') as brand FROM ideas i LEFT JOIN users u ON i.created_by = u.id ORDER BY i.created_at DESC`);
          break;
        case 'messages':
          result = await pool.query(`SELECT dm.id, u1.full_name as from_user, u2.full_name as to_user, LEFT(dm.content, 80) as preview, dm.created_at FROM direct_messages dm LEFT JOIN users u1 ON dm.sender_id = u1.id LEFT JOIN users u2 ON dm.recipient_id = u2.id ORDER BY dm.created_at DESC LIMIT 200`);
          break;
        case 'join_requests':
          result = await pool.query(`SELECT jr.id, u.full_name as user_name, i.title as idea_title, jr.status, jr.interest_type, jr.created_at FROM join_requests jr LEFT JOIN users u ON jr.user_id = u.id LEFT JOIN ideas i ON jr.idea_id = i.id ORDER BY jr.created_at DESC`);
          break;
        default:
          return res.status(400).json({ error: "Invalid category" });
      }

      res.json({ data: result.rows });
    } catch (error) {
      console.error("Analytics drilldown error:", error);
      res.status(500).json({ error: "Failed to fetch drilldown data" });
    }
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
      if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
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

  app.get("/api/profile/industries", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const profile = await storage.getProfile(req.session.userId);
      if (!profile) {
        return res.json([]);
      }
      const industries = await storage.getProfileIndustries(profile.id);
      res.json(industries);
    } catch (error) {
      console.error("Fetch profile industries error:", error);
      res.status(500).json({ error: "Failed to fetch profile industries" });
    }
  });

  app.post("/api/profile/industries", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { industryIds } = req.body;
      if (!Array.isArray(industryIds)) {
        return res.status(400).json({ error: "industryIds must be an array" });
      }
      if (industryIds.length > 5) {
        return res.status(400).json({ error: "Maximum 5 industries allowed" });
      }

      const profile = await storage.getProfile(req.session.userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      await storage.setProfileIndustries(profile.id, industryIds);
      const updatedIndustries = await storage.getProfileIndustries(profile.id);
      res.json(updatedIndustries);
    } catch (error) {
      console.error("Save profile industries error:", error);
      res.status(500).json({ error: "Failed to save profile industries" });
    }
  });

  app.post("/api/profile/industries/suggest", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const profile = await storage.getProfile(req.session.userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const suggestedNames = await classifyProfileIndustries(
        profile.bio || '',
        profile.skills || [],
        profile.interests || []
      );

      const allIndustries = await storage.getIndustries();
      const suggested = allIndustries.filter(ind => suggestedNames.includes(ind.name));
      res.json(suggested);
    } catch (error) {
      console.error("AI industry suggestion error:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
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
        // Create notification for the recipient
        await storage.createNotification({
          userId: recipientId,
          type: 'connection_request',
          title: 'Connection Request',
          message: `${sender.fullName || 'Someone'} wants to connect with you`,
          link: '/portal/collaborators',
        });
        
        const { sendConnectionRequestEmail } = await import('./email');
        sendConnectionRequestEmail(
          recipient.email,
          recipient.fullName || 'there',
          sender.fullName || 'Someone',
          message,
          connection.id,
          connection.acceptToken || undefined
        ).catch(err => {
          console.error('Failed to send connection request email:', err);
        });
      }
      
      res.json(connection);
    } catch (error: any) {
      console.error("Send connection error:", error);
      if (error.message === 'Connection already exists') {
        return res.status(400).json({ error: "Connection already exists" });
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

  // Preview connection request for the accept page (public, validates token)
  app.get("/api/connections/preview", async (req: Request, res: Response) => {
    try {
      const { requestId, token } = req.query;
      
      if (!requestId || !token || typeof requestId !== 'string' || typeof token !== 'string') {
        return res.status(400).json({ error: "Invalid link" });
      }

      const connection = await storage.getConnectionByToken(requestId, token);
      if (!connection) {
        return res.status(404).json({ error: "Connection request not found or already handled" });
      }
      
      // Get the requester's profile
      const requester = await storage.getProfile(connection.requesterId);
      if (!requester) {
        return res.status(404).json({ error: "Requester profile not found" });
      }

      // Get university info if available
      let university = null;
      if (requester.universityId) {
        university = await storage.getUniversity(requester.universityId);
      }
      
      res.json({
        id: requester.userId,
        fullName: requester.fullName || 'Unknown User',
        email: requester.email,
        bio: requester.bio,
        avatarUrl: requester.avatarUrl,
        skills: requester.skills || [],
        interests: requester.interests || [],
        university: university ? { name: university.name, shortName: university.shortName } : null,
        message: connection.message
      });
    } catch (error) {
      console.error("Preview connection error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Accept connection via token (POST for the frontend page)
  app.post("/api/connections/accept-with-token", async (req: Request, res: Response) => {
    try {
      const { requestId, token } = req.body;
      
      if (!requestId || !token) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const connection = await storage.acceptConnectionByToken(requestId, token);
      if (!connection) {
        return res.status(404).json({ error: "Connection request not found or already handled" });
      }
      
      // Get profiles for notifications
      const [requester, recipient] = await Promise.all([
        storage.getProfile(connection.requesterId),
        storage.getProfile(connection.recipientId)
      ]);
      
      // Notify the requester that their connection was accepted
      await storage.createNotification({
        userId: connection.requesterId,
        type: 'connection_accepted',
        title: 'Connection Accepted',
        message: `${recipient?.fullName || 'Someone'} accepted your connection request`,
        link: '/portal/collaborators',
      });
      
      // Create a welcome message in the conversation
      if (requester && recipient) {
        await db.insert(schema.directMessages).values({
          senderId: connection.recipientId,
          recipientId: connection.requesterId,
          content: `Hi ${requester.fullName?.split(' ')[0] || 'there'}! I just accepted your connection request. Looking forward to connecting!`
        });
      }
      
      // Send email to the requester (if notifications enabled)
      if (requester?.email && requester?.emailNotificationsEnabled !== false) {
        const { sendCollaboratorRequestAcceptedEmail } = await import('./email');
        sendCollaboratorRequestAcceptedEmail(
          requester.email,
          requester.fullName || 'there',
          recipient?.fullName || 'Someone'
        ).catch(err => {
          console.error('Failed to send connection accepted email:', err);
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Accept connection by token error:", error);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Reject connection via token (POST for the frontend page)
  app.post("/api/connections/reject-with-token", async (req: Request, res: Response) => {
    try {
      const { requestId, token } = req.body;
      
      if (!requestId || !token) {
        return res.status(400).json({ error: "Invalid request" });
      }

      const connection = await storage.rejectConnectionByToken(requestId, token);
      if (!connection) {
        return res.status(404).json({ error: "Connection request not found or already handled" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Reject connection by token error:", error);
      res.status(500).json({ error: "Server error" });
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
      
      // Notify the requester that their connection was accepted
      const accepter = await storage.getProfile(req.session.userId);
      await storage.createNotification({
        userId: connection.requesterId,
        type: 'connection_accepted',
        title: 'Connection Accepted',
        message: `${accepter?.fullName || 'Someone'} accepted your connection request`,
        link: '/portal/collaborators',
      });
      
      // Send email to the requester (if notifications enabled)
      const requester = await storage.getProfile(connection.requesterId);
      if (requester?.email && requester?.emailNotificationsEnabled !== false) {
        const { sendCollaboratorRequestAcceptedEmail } = await import('./email');
        sendCollaboratorRequestAcceptedEmail(
          requester.email,
          requester.fullName || 'there',
          accepter?.fullName || 'Someone'
        ).catch(err => {
          console.error('Failed to send connection accepted email:', err);
        });
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

  // Create user (admin only)
  app.post("/api/admin/users", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const userRoles = await storage.getUserRoles(req.session.userId);
      const isAdmin = userRoles.some(r => r.role === 'admin');
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { email, fullName } = req.body;
      if (!email || !fullName) {
        return res.status(400).json({ error: "Email and full name are required" });
      }

      const existingUser = await storage.getUserByEmail(email.trim().toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const crypto = await import('crypto');
      const temporaryPassword = crypto.randomBytes(6).toString('base64url');
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      const user = await storage.createUser({ email: email.trim().toLowerCase(), password: hashedPassword, fullName: fullName.trim() });

      await storage.createProfile(user.id, {
        email: user.email,
        fullName: user.fullName,
        verificationStatus: "pending",
        onboardingCompleted: false,
        skills: [],
        interests: []
      });
      await storage.addUserRole(user.id, "student");

      const { sendAccountCreatedEmail } = await import('./email');
      sendAccountCreatedEmail(user.email, user.fullName || 'there', temporaryPassword)
        .then(() => console.log(`[Admin] Account created email sent to: ${user.email}`))
        .catch(err => console.error(`[Admin] Failed to send account created email to ${user.email}:`, err));

      res.json({ success: true, user: { id: user.id, email: user.email, fullName: user.fullName } });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Failed to create user" });
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

  // ============ Announcements API ============
  
  // Get active announcements (public)
  app.get("/api/announcements", async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const announcements = await db.select()
        .from(schema.announcements)
        .where(
          and(
            eq(schema.announcements.isActive, true),
            lte(schema.announcements.startsAt, now),
            or(
              isNull(schema.announcements.endsAt),
              gt(schema.announcements.endsAt, now)
            )
          )
        )
        .orderBy(desc(schema.announcements.priority), desc(schema.announcements.createdAt));
      
      res.json(announcements);
    } catch (error) {
      console.error("Get announcements error:", error);
      res.status(500).json({ error: "Failed to get announcements" });
    }
  });

  // Get all announcements (admin only)
  app.get("/api/admin/announcements", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const announcements = await db.select()
        .from(schema.announcements)
        .orderBy(desc(schema.announcements.createdAt));
      
      res.json(announcements);
    } catch (error) {
      console.error("Get admin announcements error:", error);
      res.status(500).json({ error: "Failed to get announcements" });
    }
  });

  // Create announcement (admin only)
  app.post("/api/admin/announcements", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { title, message, type, priority, startsAt, endsAt, isActive, sendEmail } = req.body;

      if (!title || !message) {
        return res.status(400).json({ error: "Title and message are required" });
      }

      const [announcement] = await db.insert(schema.announcements)
        .values({
          title,
          message,
          type: type || 'general',
          priority: priority || 'normal',
          startsAt: startsAt ? new Date(startsAt) : new Date(),
          endsAt: endsAt ? new Date(endsAt) : null,
          isActive: isActive !== false,
          createdBy: req.session.userId,
        })
        .returning();
      
      // Send email to all users if sendEmail is true
      if (sendEmail) {
        try {
          const { sendAnnouncementEmail } = await import('./email');
          
          // Get all users with email addresses
          const users = await db.select({
            id: schema.users.id,
            email: schema.users.email,
          }).from(schema.users);
          
          // Get profiles for user names
          const profiles = await db.select({
            userId: schema.profiles.userId,
            fullName: schema.profiles.fullName,
          }).from(schema.profiles);
          
          const profileMap = new Map(profiles.map(p => [p.userId, p.fullName]));
          
          // Send emails in batches to avoid rate limiting
          const emailPromises = users.map(async (user) => {
            if (user.email) {
              try {
                await sendAnnouncementEmail(
                  user.email,
                  profileMap.get(user.id) || '',
                  {
                    title,
                    message,
                    type: type || 'general',
                    priority: priority || 'normal',
                  }
                );
              } catch (emailError) {
                console.error(`Failed to send announcement email to ${user.email}:`, emailError);
              }
            }
          });
          
          // Process emails but don't block the response
          Promise.allSettled(emailPromises).then((results) => {
            const sent = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            console.log(`Announcement emails: ${sent} sent, ${failed} failed out of ${users.length} users`);
          });
          
        } catch (emailSetupError) {
          console.error('Failed to setup announcement email sending:', emailSetupError);
        }
      }
      
      res.json(announcement);
    } catch (error) {
      console.error("Create announcement error:", error);
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  // Update announcement (admin only)
  app.patch("/api/admin/announcements/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const announcementId = parseInt(req.params.id);
      const { title, message, type, priority, startsAt, endsAt, isActive } = req.body;

      const updateData: any = { updatedAt: new Date() };
      if (title !== undefined) updateData.title = title;
      if (message !== undefined) updateData.message = message;
      if (type !== undefined) updateData.type = type;
      if (priority !== undefined) updateData.priority = priority;
      if (startsAt !== undefined) updateData.startsAt = new Date(startsAt);
      if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt) : null;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [announcement] = await db.update(schema.announcements)
        .set(updateData)
        .where(eq(schema.announcements.id, announcementId))
        .returning();
      
      if (!announcement) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      res.json(announcement);
    } catch (error) {
      console.error("Update announcement error:", error);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });

  // Delete announcement (admin only)
  app.delete("/api/admin/announcements/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const announcementId = parseInt(req.params.id);

      const [deleted] = await db.delete(schema.announcements)
        .where(eq(schema.announcements.id, announcementId))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Announcement not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Delete announcement error:", error);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });

  // ============ Suggestions API (Kefi) ============

  // Submit a suggestion (authenticated users)
  app.post("/api/suggestions", async (req: Request, res: Response) => {
    try {
      const { suggestion } = req.body;
      
      if (!suggestion || typeof suggestion !== 'string' || suggestion.trim().length < 10) {
        return res.status(400).json({ error: "Please provide a suggestion with at least 10 characters" });
      }

      // Get user info if authenticated
      let userEmail = "anonymous@yassu.ai";
      let userName: string | null = null;
      if (req.session.userId) {
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.session.userId));
        if (user) {
          userEmail = user.email;
          userName = user.fullName;
        }
      }

      // Create inbox conversation for admin reply capability first
      const [conversation] = await db.insert(schema.inboxConversations)
        .values({
          userId: req.session.userId || null,
          userEmail,
          userName,
          subject: `Feedback: ${suggestion.trim().slice(0, 50)}${suggestion.length > 50 ? '...' : ''}`,
          conversationType: "feedback",
        })
        .returning();

      // Add the user's message to the conversation
      await db.insert(schema.inboxMessages)
        .values({
          conversationId: conversation.id,
          senderType: "user",
          senderId: req.session.userId || null,
          content: suggestion.trim(),
        });

      // Create suggestion with link to inbox conversation
      const [created] = await db.insert(schema.suggestions)
        .values({
          userId: req.session.userId || null,
          suggestion: suggestion.trim(),
          inboxConversationId: conversation.id,
        })
        .returning();
      
      res.json({ success: true, message: "Thank you for your suggestion! The Yassu team will review it." });
    } catch (error) {
      console.error("Submit suggestion error:", error);
      res.status(500).json({ error: "Failed to submit suggestion" });
    }
  });

  // Get all suggestions (admin only)
  app.get("/api/admin/suggestions", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const allSuggestions = await db.select({
        id: schema.suggestions.id,
        userId: schema.suggestions.userId,
        suggestion: schema.suggestions.suggestion,
        status: schema.suggestions.status,
        adminNotes: schema.suggestions.adminNotes,
        reviewedBy: schema.suggestions.reviewedBy,
        reviewedAt: schema.suggestions.reviewedAt,
        inboxConversationId: schema.suggestions.inboxConversationId,
        createdAt: schema.suggestions.createdAt,
        userEmail: schema.users.email,
        userFullName: schema.users.fullName,
      })
        .from(schema.suggestions)
        .leftJoin(schema.users, eq(schema.suggestions.userId, schema.users.id))
        .orderBy(desc(schema.suggestions.createdAt));
      
      res.json(allSuggestions);
    } catch (error) {
      console.error("Get suggestions error:", error);
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  // ============ Admin Inbox API ============

  // Get all inbox conversations (admin only)
  app.get("/api/admin/inbox", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const showArchived = req.query.archived === 'true';
      const conversations = await db.select({
        id: schema.inboxConversations.id,
        userId: schema.inboxConversations.userId,
        userEmail: schema.inboxConversations.userEmail,
        userName: schema.inboxConversations.userName,
        subject: schema.inboxConversations.subject,
        conversationType: schema.inboxConversations.conversationType,
        isResolved: schema.inboxConversations.isResolved,
        isArchived: schema.inboxConversations.isArchived,
        lastMessageAt: schema.inboxConversations.lastMessageAt,
        createdAt: schema.inboxConversations.createdAt,
      })
        .from(schema.inboxConversations)
        .where(eq(schema.inboxConversations.isArchived, showArchived))
        .orderBy(desc(schema.inboxConversations.lastMessageAt));

      // Get unread count for each conversation
      const conversationsWithUnread = await Promise.all(
        conversations.map(async (conv) => {
          const [{ count }] = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(schema.inboxMessages)
            .where(
              and(
                eq(schema.inboxMessages.conversationId, conv.id),
                eq(schema.inboxMessages.senderType, "user"),
                eq(schema.inboxMessages.isRead, false)
              )
            );
          return { ...conv, unreadCount: Number(count) };
        })
      );

      res.json(conversationsWithUnread);
    } catch (error) {
      console.error("Get inbox error:", error);
      res.status(500).json({ error: "Failed to get inbox" });
    }
  });

  // Get a single conversation with messages (admin only)
  app.get("/api/admin/inbox/:conversationId", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const conversationId = parseInt(req.params.conversationId);
      if (isNaN(conversationId)) {
        return res.status(400).json({ error: "Invalid conversation ID" });
      }

      const [conversation] = await db.select()
        .from(schema.inboxConversations)
        .where(eq(schema.inboxConversations.id, conversationId));

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Get all messages for this conversation
      const messages = await db.select({
        id: schema.inboxMessages.id,
        conversationId: schema.inboxMessages.conversationId,
        senderType: schema.inboxMessages.senderType,
        senderId: schema.inboxMessages.senderId,
        content: schema.inboxMessages.content,
        isRead: schema.inboxMessages.isRead,
        createdAt: schema.inboxMessages.createdAt,
        senderName: schema.users.fullName,
        attachmentUrl: schema.inboxMessages.attachmentUrl,
      })
        .from(schema.inboxMessages)
        .leftJoin(schema.users, eq(schema.inboxMessages.senderId, schema.users.id))
        .where(eq(schema.inboxMessages.conversationId, conversationId))
        .orderBy(asc(schema.inboxMessages.createdAt));

      // Mark user messages as read
      await db.update(schema.inboxMessages)
        .set({ isRead: true })
        .where(
          and(
            eq(schema.inboxMessages.conversationId, conversationId),
            eq(schema.inboxMessages.senderType, "user")
          )
        );

      res.json({ conversation, messages });
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ error: "Failed to get conversation" });
    }
  });

  // Send a reply in a conversation (admin only)
  app.post("/api/admin/inbox/:conversationId/reply", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const conversationId = parseInt(req.params.conversationId);
      const { content } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: "Reply content is required" });
      }

      const [conversation] = await db.select()
        .from(schema.inboxConversations)
        .where(eq(schema.inboxConversations.id, conversationId));

      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Insert the reply message
      const [message] = await db.insert(schema.inboxMessages)
        .values({
          conversationId,
          senderType: "admin",
          senderId: req.session.userId,
          content: content.trim(),
          isRead: false,
        })
        .returning();

      // Update conversation last message time
      await db.update(schema.inboxConversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(schema.inboxConversations.id, conversationId));

      // Send email to user
      try {
        const { sendEmail } = await import('./email');
        await sendEmail({
          to: conversation.userEmail,
          subject: `Re: ${conversation.subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Yassu</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <p>Hi${conversation.userName ? ` ${conversation.userName}` : ''},</p>
                <p>We've responded to your feedback:</p>
                <div style="background: white; padding: 20px; border-left: 4px solid #6366f1; margin: 20px 0;">
                  ${content.replace(/\n/g, '<br>')}
                </div>
                <p>If you have any follow-up questions, you can reply to this email or submit new feedback through the platform.</p>
                <p>Best,<br>The Yassu Team</p>
              </div>
            </div>
          `,
          emailType: 'admin_inbox',
        });
      } catch (emailError) {
        console.error("Failed to send reply email:", emailError);
      }

      res.json({ success: true, message });
    } catch (error) {
      console.error("Send reply error:", error);
      res.status(500).json({ error: "Failed to send reply" });
    }
  });

  // Toggle conversation resolved status (admin only)
  app.patch("/api/admin/inbox/:conversationId/resolve", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const conversationId = parseInt(req.params.conversationId);
      const { isResolved } = req.body;

      const [updated] = await db.update(schema.inboxConversations)
        .set({ isResolved: Boolean(isResolved) })
        .where(eq(schema.inboxConversations.id, conversationId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Toggle resolve error:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  // Archive/unarchive a conversation (admin only)
  app.patch("/api/admin/inbox/:conversationId/archive", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const conversationId = parseInt(req.params.conversationId);
      const { isArchived } = req.body;

      const [updated] = await db.update(schema.inboxConversations)
        .set({ isArchived: Boolean(isArchived) })
        .where(eq(schema.inboxConversations.id, conversationId))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Archive error:", error);
      res.status(500).json({ error: "Failed to archive conversation" });
    }
  });

  // Delete a conversation (admin only)
  app.delete("/api/admin/inbox/:conversationId", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const conversationId = parseInt(req.params.conversationId);

      // Delete messages first (foreign key constraint)
      await db.delete(schema.inboxMessages)
        .where(eq(schema.inboxMessages.conversationId, conversationId));

      // Delete the conversation
      const [deleted] = await db.delete(schema.inboxConversations)
        .where(eq(schema.inboxConversations.id, conversationId))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json({ success: true, deleted });
    } catch (error) {
      console.error("Delete conversation error:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Sync emails from Outlook (admin only)
  app.post("/api/admin/inbox/sync-outlook", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { syncOutlookEmails } = await import("./services/outlook-inbox");
      const result = await syncOutlookEmails();
      
      res.json({ success: true, message: `Synced from ${result.connectedEmail}: ${result.new} new conversations, ${result.updated} new messages` });
    } catch (error: any) {
      console.error("Outlook sync error:", error);
      res.status(500).json({ error: "Failed to sync Outlook emails" });
    }
  });

  // Get foundry events with attendees (admin only)
  app.get("/api/admin/foundry-events", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get all events
      const events = await db.select()
        .from(schema.foundryEvents)
        .orderBy(desc(schema.foundryEvents.startTime));

      // Get attendees for each event
      const eventsWithAttendees = await Promise.all(events.map(async (event) => {
        const rsvps = await db.select({
          id: schema.profiles.userId,
          fullName: schema.profiles.fullName,
          email: schema.users.email,
          avatarUrl: schema.profiles.avatarUrl,
          status: schema.eventRsvps.status,
        })
          .from(schema.eventRsvps)
          .innerJoin(schema.users, eq(schema.eventRsvps.userId, schema.users.id))
          .innerJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
          .where(eq(schema.eventRsvps.eventId, event.id))
          .orderBy(schema.eventRsvps.status);

        return {
          id: event.id,
          title: event.title,
          eventType: event.eventType,
          startTime: event.startTime,
          endTime: event.endTime,
          attendees: rsvps,
        };
      }));

      res.json(eventsWithAttendees);
    } catch (error) {
      console.error("Get foundry events error:", error);
      res.status(500).json({ error: "Failed to get foundry events" });
    }
  });

  // Update suggestion status (admin only)
  app.patch("/api/admin/suggestions/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const suggestionId = parseInt(req.params.id);
      const { status, adminNotes } = req.body;

      const updateData: any = {
        reviewedBy: req.session.userId,
        reviewedAt: new Date(),
      };

      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

      const [updated] = await db.update(schema.suggestions)
        .set(updateData)
        .where(eq(schema.suggestions.id, suggestionId))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Suggestion not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update suggestion error:", error);
      res.status(500).json({ error: "Failed to update suggestion" });
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
  
  // Get unread message count - MUST be before :userId route
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
      
      // Create notification and send email
      try {
        const sender = await db.select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, req.session.userId))
          .limit(1);
        
        const recipientProfile = await db.select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, recipientId))
          .limit(1);
        
        // Create notification for the recipient
        await storage.createNotification({
          userId: recipientId,
          type: 'new_message',
          title: 'New Message',
          message: `${sender[0]?.fullName || 'Someone'} sent you a message`,
          link: `/portal/messages`,
        });
        
        // Only send email if recipient has message notifications enabled
        const recipientEmail = recipientProfile[0]?.email || recipient[0]?.email;
        const messageNotificationsEnabled = recipientProfile[0]?.messageNotificationsEnabled !== false;
        const generalNotificationsEnabled = recipientProfile[0]?.emailNotificationsEnabled !== false;
        
        if (recipientEmail && messageNotificationsEnabled && generalNotificationsEnabled) {
          const { sendNewMessageEmail } = await import('./email');
          await sendNewMessageEmail(
            recipientEmail,
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
      const { ideaId, message, conversationHistory, uploadedPlan } = req.body;

      if (!ideaId || !message) {
        return res.status(400).json({ error: "Idea ID and message are required" });
      }

      // Get idea and business plan context
      const idea = await storage.getIdea(ideaId);
      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      // Use uploaded plan if provided, otherwise get from database
      let businessPlanContext = "";
      if (uploadedPlan && uploadedPlan.length > 0) {
        businessPlanContext = uploadedPlan;
      } else {
        // Get business plan sections if available
        const workflowSections = await db.select()
          .from(schema.ideaWorkflowSections)
          .where(eq(schema.ideaWorkflowSections.ideaId, ideaId));

        businessPlanContext = workflowSections.length > 0
          ? workflowSections.map(s => `## ${s.sectionType}\n${s.content}`).join("\n\n")
          : "";
      }

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
- IMPORTANT: If suggesting mobile app development with Expo, ONLY use Expo Go-compatible packages. AVOID suggesting these native-only packages that won't work in Expo Go: react-native-maps, react-native-camera, react-native-ble-plx, react-native-nfc-manager, or any package requiring native code compilation. Instead suggest Expo SDK alternatives like expo-camera, expo-location (without maps), or web-based alternatives.

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
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);
      
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
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);
      
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
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);
      
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
- All pitch decks target ANGEL INVESTORS
- University founders typically raise from angels who value: founder story, passion, market insight, and early conviction
- Focus on personal credibility, vision, and specific use of funds

Return a JSON object with this EXACT structure:
{
  "analysis": {
    "investorMode": "angel",
    "investorModeReason": "Angel investors are ideal for university founders - they value founder story, passion, and early conviction over established metrics",
    "deckType": "full",
    "deckTypeReason": "Full 10-slide deck for investor meetings",
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
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);
      
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
      let teamContext = "";
      if (ideaId) {
        const idea = await storage.getIdea(ideaId);
        if (idea) {
          const workflowSections = await db.select()
            .from(schema.ideaWorkflowSections)
            .where(eq(schema.ideaWorkflowSections.ideaId, ideaId));

          if (workflowSections.length > 0) {
            ideaContext = workflowSections.map(s => `## ${s.sectionType}\n${s.content}`).join("\n\n");
          }
          
          // Fetch team members and advisors for Team slide
          const teams = await db.select()
            .from(schema.teams)
            .where(eq(schema.teams.ideaId, ideaId))
            .limit(1);
          
          if (teams.length > 0) {
            const teamMembers = await db.select()
              .from(schema.teamMembers)
              .where(eq(schema.teamMembers.teamId, teams[0].id));
            
            if (teamMembers.length > 0) {
              const memberProfiles = await Promise.all(
                teamMembers.map(async (m: any) => {
                  const profile = await storage.getProfile(m.userId);
                  return profile ? {
                    role: m.role,
                    fullName: profile.fullName || "Team Member",
                    headline: profile.headline || "",
                    skills: profile.skills || [],
                    interests: profile.interests || [],
                    bio: profile.bio || "",
                  } : null;
                })
              );
              
              const validMembers = memberProfiles.filter(Boolean);
              if (validMembers.length > 0) {
                teamContext = `\n\nTEAM MEMBERS:\n${validMembers.map((m: any) => 
                  `- ${m.fullName} (${m.role}): ${m.headline || m.bio || ""}${m.skills?.length ? ` | Skills: ${m.skills.join(", ")}` : ""}`
                ).join("\n")}`;
              }
            }
          }
          
          // Also check for advisors connected to this idea's creator
          const ideaOwnerProfile = await storage.getProfile(idea.createdBy);
          if (ideaOwnerProfile) {
            const ownerBadges = await storage.getUserBadges(idea.createdBy);
            
            // Add founder info with explicit name and credentials
            const founderName = ideaOwnerProfile.fullName || "Founder";
            const founderHeadline = ideaOwnerProfile.headline || ideaOwnerProfile.bio || "";
            const founderSkills = ideaOwnerProfile.skills || [];
            
            teamContext = `\n\n=== ACTUAL TEAM PROFILES (USE THESE EXACT NAMES AND CREDENTIALS) ===\n\nFOUNDER/CEO:\n- Name: ${founderName}\n- Background: ${founderHeadline}${founderSkills.length ? `\n- Key Skills: ${founderSkills.join(", ")}` : ""}` + teamContext;
            
            console.log("[Pitch Deck] Team context being sent to AI:", teamContext);
          }
        }
      }

      // Always target Angel Investors for university founders
      const slideCount = 10;
      const maxBullets = 4;

      const slideStructure = `1. Title & Hook - Company name, one powerful tagline, founder introduction
2. Problem - The pain point you're solving, who suffers, and why it matters personally to you
3. Solution - Your unique approach, what makes it different, the "aha moment"
4. Market Opportunity - Who are your customers, market size, growth trends
5. Product - What you're building, key features, current stage
6. Business Model - How you make money, pricing, unit economics if available
7. Traction - What you've accomplished so far, early wins, validation signals
8. Competition - Competitive landscape, why you'll win, your unfair advantage
9. Team - Founder story, why YOU are the right person to build this, relevant experience
10. The Ask - Funding amount, specific use of funds, key milestones, call to action`;

      const investorTone = `ANGEL INVESTOR OPTIMIZATION (for university founders):
- Lead with your founder story - why YOU specifically are obsessed with this problem
- Emphasize personal connection to the problem and unique insight
- Show passion and determination - angels invest in founders first, ideas second
- Be specific about what you'll accomplish with the funding (first 12-18 months)
- Highlight early conviction signals: customer conversations, waitlists, prototypes, advisors
- Use authentic, conversational language - not corporate jargon
- Show you understand the risks and have thought through them
- Make the "Why Now" clear - what's changed that makes this possible today
- Include a clear, actionable ask: exact amount, specific use breakdown, timeline
- End with momentum: what have you already started doing with your own resources`;

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
${teamContext}

${businessPlanNotes ? `ADDITIONAL NOTES:\n${businessPlanNotes}\n` : ""}
${ideaContext ? `BUSINESS PLAN CONTEXT:\n${ideaContext}\n` : ""}

Generate a 10-slide PITCH DECK for angel investor meetings.

REQUIRED SLIDES:
${slideStructure}

For EACH slide, generate using this EXACT structure:
{
  "slideNumber": <number>,
  "slideTitle": "<title>",
  "investorBelief": "<what the angel investor must believe after this slide>",
  "primaryHeadline": "<ONE compelling sentence - focus on founder story and vision>",
  "supportingSubheadline": "<one clarifying sentence, optional>",
  "keyPoints": ["<bullet 1>", "<bullet 2>", "<bullet 3>", "<bullet 4>"],
  "suggestedVisual": "<e.g. bar chart, comparison table, funnel, timeline, icon row>",
  "presenterNotes": "<what to SAY when presenting this slide - be conversational>"
}

Also generate a metrics validation table:
{
  "metricsValidation": [
    {
      "slideNumber": <number>,
      "slideTitle": "<title>",
      "metricsRequired": "<what angels look for - often qualitative signals>",
      "proxyMetrics": "<early-stage alternatives: customer conversations, waitlist size, prototype feedback>",
      "riskLevel": "<Low|Medium|High>",
      "sensitivityNotes": "<what concerns an angel might have and how to address>"
    }
  ]
}

CRITICAL RULES FOR ANGEL INVESTORS:
- Lead with founder story and personal connection to the problem
- No corporate jargon - use authentic, passionate language
- Show you've done the work: customer interviews, research, early prototypes
- Be specific about the ask: exact amount and exactly how you'll use it
- Maximum ${maxBullets} bullet points per slide - keep it simple
- Angels invest in PEOPLE first - make your credibility shine

TEAM SLIDE INSTRUCTIONS (Slide 9):
- CRITICAL: Use the EXACT NAMES from the "ACTUAL TEAM PROFILES" section above
- Lead with founder's PERSONAL story and connection to the problem
- The first bullet point MUST include the founder's full name (e.g., "Pauline Teo - Entrepreneur & Mentor...")
- Copy the founder's headline/background VERBATIM as their credential line
- Show "founder-market fit" - why this specific person is uniquely positioned to solve this problem
- Include relevant experience, skills, and what drives you
- If early stage: mention advisors or mentors you've connected with
- Be authentic about what you bring and what gaps you're looking to fill

THE ASK SLIDE INSTRUCTIONS (Slide 10):
- State the exact funding amount (angels typically invest $25K-$250K individually)
- Break down use of funds into 3-4 specific categories with percentages
- List 3 key milestones you'll hit in 12-18 months with this funding
- Include clear next steps: "Let's schedule a follow-up call this week"
- Optional: mention if you have soft commits or a lead investor
- End with your contact info and availability

Return ONLY valid JSON with this structure:
{
  "slides": [...],
  "metricsValidation": [...]
}`;

      const OpenAI = (await import("openai")).default;
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);
      
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

      const slidesJson = JSON.stringify(slides, null, 2);

      const prompt = `You are an experienced angel investor and pitch coach. Your job is to make this pitch deck irresistible to angel investors.

CURRENT DECK:
${slidesJson}

TARGET: Angel Investors (focus on founder story, authentic passion, clear vision, specific use of funds)
DECK FORMAT: 10 slides for angel meetings

YOUR TASK FOR ANGEL INVESTOR OPTIMIZATION:
1. Strengthen the founder story and personal connection throughout
2. Tighten ALL headlines - make them punchier and more memorable
3. Remove ALL corporate jargon - replace with authentic, passionate language
4. Add "Why Now" logic if missing - what makes this moment special
5. Make the Ask slide crystal clear: exact amount, specific use, clear milestones
6. Ensure each slide creates ONE clear "I want to back this founder" moment

CRITICAL RULES FOR ANGEL DECKS:
- Return ONLY the refined slides, no explanations
- Keep the exact same JSON structure
- Maximum 4 key points per slide
- Every slide should reinforce why THIS founder is the right person
- Make it conversational - angels invest in people they like and trust
- Be specific about early traction signals (even small ones count)

Return the refined deck as valid JSON:
{
  "slides": [...]
}`;

      const OpenAI = (await import("openai")).default;
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);
      
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

      const slidesJson = JSON.stringify(pitchDeckSlides, null, 2);

      const prompt = `You are an experienced angel investor and pitch coach who has invested in 50+ early-stage startups.

Your task is to prepare this university founder for their angel investor pitch - not to create slides, but to help them DELIVER the pitch with authenticity, handle objections gracefully, and build genuine connection with potential angel investors.

PITCH DECK SLIDES:
${slidesJson}

BUSINESS PLAN CONTEXT:
${businessPlan || "Not provided"}

TARGET AUDIENCE: Angel Investors who invest $25K-$250K in early-stage startups
FOCUS: Founder story, authentic passion, vision clarity, personal connection to problem, specific use of funds

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
- Focus on founder conviction, narrative clarity, and authentic passion

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
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);
      
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

  // Kefi Help Assistant endpoint
  app.post("/api/help/chat", async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory = [], attachmentUrl } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      // Check if this is a suggestion submission
      const suggestionPatterns = [
        /^(?:i have a suggestion|i'd like to suggest|i want to suggest|suggestion:|feature request:|my suggestion is|here's a suggestion|can you add|please add|you should add|it would be nice if|i wish yassu|yassu should)/i,
        /(?:suggestion for yassu|feedback for yassu|improve yassu|feature idea)/i
      ];
      
      const isSuggestion = suggestionPatterns.some(pattern => pattern.test(message.trim()));
      
      if (isSuggestion && message.length >= 10) {
        // Extract and save the suggestion
        let suggestionText = message
          .replace(/^(?:i have a suggestion:|i'd like to suggest:|suggestion:|feature request:|my suggestion is:|here's a suggestion:)\s*/i, '')
          .trim();
        
        if (suggestionText.length < 10) {
          suggestionText = message;
        }

        // Get user info for email notification
        let userEmail = null;
        let userName = null;
        if (req.session.userId) {
          const [userInfo] = await db.select({
            email: schema.users.email,
            fullName: schema.profiles.fullName,
          })
            .from(schema.users)
            .leftJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
            .where(eq(schema.users.id, req.session.userId));
          if (userInfo) {
            userEmail = userInfo.email;
            userName = userInfo.fullName;
          }
        }

        // Create inbox conversation for admin reply capability
        const [conversation] = await db.insert(schema.inboxConversations)
          .values({
            userId: req.session.userId || null,
            userEmail: userEmail || "anonymous@yassu.ai",
            userName,
            subject: `Feedback: ${suggestionText.slice(0, 50)}${suggestionText.length > 50 ? '...' : ''}`,
            conversationType: "feedback",
          })
          .returning();

        // Add the user's message to the conversation
        await db.insert(schema.inboxMessages)
          .values({
            conversationId: conversation.id,
            senderType: "user",
            senderId: req.session.userId || null,
            content: suggestionText,
            attachmentUrl: attachmentUrl || null,
          });

        // Create suggestion with link to inbox conversation
        await db.insert(schema.suggestions)
          .values({
            userId: req.session.userId || null,
            suggestion: suggestionText,
            inboxConversationId: conversation.id,
          });

        // Send email notification to hello@yassu.ai with user's email for follow-up
        try {
          const { sendEmail } = await import('./email');
          await sendEmail({
            to: "hello@yassu.ai",
            subject: `New User Feedback: ${suggestionText.substring(0, 50)}${suggestionText.length > 50 ? '...' : ''}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #7c3aed;">New User Feedback Received</h2>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 0 0 8px 0;"><strong>From:</strong> ${userName || 'Anonymous User'}</p>
                  ${userEmail ? `<p style="margin: 0 0 8px 0;"><strong>Email:</strong> <a href="mailto:${userEmail}">${userEmail}</a></p>` : '<p style="margin: 0 0 8px 0;"><strong>Email:</strong> Not logged in</p>'}
                  <p style="margin: 0;"><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
                </div>
                <h3 style="margin-bottom: 8px;">Feedback:</h3>
                <div style="background: #fff; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px;">
                  <p style="margin: 0; white-space: pre-wrap;">${suggestionText}</p>
                </div>
                ${userEmail ? `<p style="margin-top: 20px; font-size: 14px; color: #666;">You can reply directly to this email to respond to the user.</p>` : ''}
              </div>
            `,
            emailType: 'other',
          });
        } catch (emailError) {
          console.error("Failed to send feedback notification email:", emailError);
        }

        return res.json({
          success: true,
          message: "Thank you so much for your suggestion! I've recorded it and the Yassu team will review it. Your feedback helps make the platform better for all student founders. Is there anything else I can help you with?",
          suggestionSaved: true
        });
      }

      const { searchHelpTopics, getHelpContext } = await import('./helpContent');
      
      const relevantTopics = searchHelpTopics(message);
      const contextFromTopics = relevantTopics.length > 0 
        ? relevantTopics.map(t => `## ${t.title}\n${t.content}`).join('\n\n')
        : getHelpContext();

      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "AI service not configured" });
      }

      const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);

      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey, baseURL });

      const systemPrompt = `You are Kefi, a friendly and knowledgeable AI assistant for Yassu - a platform for university students to start their entrepreneurial journey.

Your personality:
- Warm, encouraging, and genuinely helpful
- Expert knowledge about the Yassu platform and startup fundamentals
- Smart and able to infer answers even when topics aren't explicitly documented
- You use simple language but provide thorough, actionable answers

## Yassu Platform Overview:
Yassu helps student founders go from idea to launch. Key features include:
- **Posting Ideas**: Users create startup ideas with Problem, Solution, Target Users, and Why Now sections
- **AI Business Plan**: Generates comprehensive 9-section business plans tailored to business type
- **Pitch Deck Generator**: Creates investor-ready 10-slide pitch decks optimized for angel investors
- **Pitch Preparation**: Scripts, objection handling, Q&A prep for investor meetings
- **MVP Builder**: Feature prioritization, technical specs, and design requirements
- **Team Building**: Find co-founders, advisors, and collaborators by skills/interests
- **Journey Tracker**: 7-step progress tracker (Post Idea → Launch)
- **Manus Integration**: Copy/export formatted specs to Manus.im for AI-assisted design

## Your Knowledge Base:
${contextFromTopics}

## Smart Response Guidelines:
1. **Be helpful first**: If someone asks about a feature, try to give a useful answer based on the platform structure, even if not explicitly in your knowledge base
2. **Infer from context**: Use your understanding of the platform to provide reasonable guidance
3. **For copying/exporting content**: Most sections have Copy buttons - users can copy content to use in Manus, Figma, or share with developers
4. **For Manus specifically**: Tell users to use the Copy button on any business plan section, then paste into Manus (manus.im) for AI-assisted design
5. **Step-by-step answers**: Use numbered steps for how-to questions
6. **Entrepreneurship advice**: You can give general startup advice when relevant
7. **Suggestions**: If someone wants to give feedback, tell them to phrase it as "I have a suggestion: [their idea]" and you'll record it

Remember: Be helpful and provide value. If you're genuinely unsure, say so briefly but still try to point them in the right direction.`;

      const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        { role: 'system', content: systemPrompt }
      ];

      for (const msg of conversationHistory.slice(-6)) {
        messages.push({ role: msg.role, content: msg.content });
      }
      messages.push({ role: 'user', content: message });

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 800,
        temperature: 0.7,
      });

      const assistantMessage = response.choices[0]?.message?.content;
      if (!assistantMessage) {
        return res.status(500).json({ error: "Failed to generate response" });
      }

      res.json({ 
        success: true, 
        message: assistantMessage,
        topicsUsed: relevantTopics.map(t => t.title)
      });
    } catch (error) {
      console.error("Kefi help chat error:", error);
      res.status(500).json({ error: "Failed to process your question" });
    }
  });

  // ==========================================
  // FOUNDRY EVENTS ROUTES
  // ==========================================

  // Get all upcoming events
  app.get("/api/foundry/events", async (req: Request, res: Response) => {
    try {
      const events = await db.select()
        .from(schema.foundryEvents)
        .where(sql`start_time >= NOW()`)
        .orderBy(schema.foundryEvents.startTime);

      // Get RSVP counts for each event
      const eventsWithRsvps = await Promise.all(events.map(async (event) => {
        const rsvps = await db.select()
          .from(schema.eventRsvps)
          .where(and(
            eq(schema.eventRsvps.eventId, event.id),
            eq(schema.eventRsvps.status, "going")
          ));
        
        let userRsvp = null;
        if (req.session.userId) {
          const [rsvp] = await db.select()
            .from(schema.eventRsvps)
            .where(and(
              eq(schema.eventRsvps.eventId, event.id),
              eq(schema.eventRsvps.userId, req.session.userId)
            ));
          userRsvp = rsvp?.status || null;
        }

        return {
          ...event,
          rsvpCount: rsvps.length,
          userRsvp,
        };
      }));

      res.json(eventsWithRsvps);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get single event
  app.get("/api/foundry/events/:id", async (req: Request, res: Response) => {
    try {
      const [event] = await db.select()
        .from(schema.foundryEvents)
        .where(eq(schema.foundryEvents.id, parseInt(req.params.id)));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const rsvps = await db.select({
        id: schema.eventRsvps.id,
        userId: schema.eventRsvps.userId,
        status: schema.eventRsvps.status,
        userName: schema.profiles.fullName,
        avatarUrl: schema.profiles.avatarUrl,
      })
        .from(schema.eventRsvps)
        .leftJoin(schema.profiles, eq(schema.eventRsvps.userId, schema.profiles.userId))
        .where(eq(schema.eventRsvps.eventId, event.id));

      let userRsvp = null;
      if (req.session.userId) {
        const [rsvp] = await db.select()
          .from(schema.eventRsvps)
          .where(and(
            eq(schema.eventRsvps.eventId, event.id),
            eq(schema.eventRsvps.userId, req.session.userId)
          ));
        userRsvp = rsvp?.status || null;
      }

      res.json({ ...event, rsvps, userRsvp });
    } catch (error) {
      console.error("Failed to fetch event:", error);
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  // Create event (admin only)
  app.post("/api/foundry/events", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Check if user is admin
      const [admin] = await db.select()
        .from(schema.userRoles)
        .where(and(
          eq(schema.userRoles.userId, req.session.userId),
          eq(schema.userRoles.role, "admin")
        ));

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { title, description, eventType, startTime, endTime, timezone, capacity, createZoomMeeting, manualZoomLink } = req.body;

      console.log("Creating event with data:", { title, startTime, endTime, eventType });

      // Validate required fields
      if (!title || !startTime) {
        console.log("Missing required fields - title:", title, "startTime:", startTime);
        return res.status(400).json({ error: "Title and start time are required" });
      }

      // Convert Pacific Time to UTC
      // datetime-local gives us "YYYY-MM-DDTHH:MM" format
      // We interpret this as Pacific Time and convert to UTC
      const parsePacificToUTC = (timeStr: string) => {
        if (!timeStr) return null;
        try {
          console.log("Parsing time string:", timeStr, "type:", typeof timeStr);
          
          // Try standard datetime-local format first: "YYYY-MM-DDTHH:MM"
          let match = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
          
          // Fallback: Try to parse any reasonable date format
          if (!match) {
            console.log("Standard format didn't match, trying Date constructor");
            const parsed = new Date(timeStr);
            if (!isNaN(parsed.getTime())) {
              // Date parsed successfully, add Pacific offset
              const monthNum = parsed.getMonth() + 1; // 1-12
              const isPDT = monthNum >= 3 && monthNum <= 11;
              const hoursToAdd = isPDT ? 7 : 8;
              return new Date(parsed.getTime() + hoursToAdd * 60 * 60 * 1000);
            }
            console.error("Time string doesn't match any expected format:", timeStr);
            return null;
          }
          
          const [, year, month, day, hour, minute] = match;
          
          // Determine if we're in PDT (roughly March-November)
          const monthNum = parseInt(month);
          const isPDT = monthNum >= 3 && monthNum <= 11;
          const offset = isPDT ? "-07:00" : "-08:00";
          
          // Create ISO string with Pacific timezone
          const isoWithTz = `${year}-${month}-${day}T${hour}:${minute}:00${offset}`;
          console.log("Constructed ISO with timezone:", isoWithTz);
          
          const result = new Date(isoWithTz);
          console.log("Parsed date:", result.toISOString());
          
          return result;
        } catch (e) {
          console.error("Failed to parse Pacific time:", e, timeStr);
          return null;
        }
      };

      const startDateUTC = parsePacificToUTC(startTime);
      const endDateUTC = endTime ? parsePacificToUTC(endTime) : null;

      // Validate parsed dates
      if (!startDateUTC || isNaN(startDateUTC.getTime())) {
        return res.status(400).json({ error: "Invalid start time format" });
      }

      let zoomMeetingId = null;
      let zoomJoinUrl = manualZoomLink || null;
      let zoomStartUrl = null;
      let zoomPasscode = null;

      // Create Zoom meeting if requested and credentials are configured
      if (createZoomMeeting) {
        const { zoomService } = await import("./services/zoom");
        if (zoomService.isConfigured()) {
          try {
            const startDate = startDateUTC;
            const endDate = endDateUTC;
            const duration = endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / 60000) : 60;

            const meeting = await zoomService.createMeeting({
              topic: title,
              startTime: startDate,
              duration,
              timezone: timezone || "America/New_York",
              agenda: description || "",
            });

            zoomMeetingId = String(meeting.id);
            zoomJoinUrl = meeting.join_url;
            zoomStartUrl = meeting.start_url;
            zoomPasscode = meeting.password;
          } catch (zoomError) {
            console.error("Failed to create Zoom meeting:", zoomError);
            // Continue without Zoom - we'll just save without the meeting link
          }
        }
      }

      console.log("Inserting event with startDateUTC:", startDateUTC, "endDateUTC:", endDateUTC);
      
      const [event] = await db.insert(schema.foundryEvents).values({
        title,
        description,
        eventType: eventType || "roadshow",
        startTime: startDateUTC!,
        endTime: endDateUTC,
        timezone: timezone || "America/New_York",
        zoomMeetingId,
        zoomJoinUrl,
        zoomStartUrl,
        zoomPasscode,
        capacity: capacity || null,
        isPublic: true,
        createdBy: req.session.userId,
      }).returning();

      console.log("Event created successfully:", event.id);
      res.json(event);
    } catch (error: any) {
      console.error("Failed to create event:", error);
      console.error("Request body:", req.body);
      res.status(500).json({ 
        error: "Failed to create event"
      });
    }
  });

  // Update event (admin only)
  app.patch("/api/foundry/events/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Check if user is admin
      const [admin] = await db.select()
        .from(schema.userRoles)
        .where(and(
          eq(schema.userRoles.userId, req.session.userId),
          eq(schema.userRoles.role, "admin")
        ));

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const eventId = parseInt(req.params.id);
      const { title, description, eventType, startTime, endTime, timezone, capacity, zoomJoinUrl, createZoomMeeting } = req.body;

      // Get the existing event first
      const [existingEvent] = await db.select()
        .from(schema.foundryEvents)
        .where(eq(schema.foundryEvents.id, eventId));

      if (!existingEvent) {
        return res.status(404).json({ error: "Event not found" });
      }

      let zoomMeetingId = existingEvent.zoomMeetingId;
      let zoomJoinUrlValue = zoomJoinUrl || existingEvent.zoomJoinUrl;
      let zoomStartUrl = existingEvent.zoomStartUrl;
      let zoomPasscode = existingEvent.zoomPasscode;

      // Create Zoom meeting if requested and not already exists
      if (createZoomMeeting && !existingEvent.zoomMeetingId) {
        const { zoomService } = await import("./services/zoom");
        if (zoomService.isConfigured()) {
          try {
            const eventStartTime = startTime ? new Date(startTime) : existingEvent.startTime;
            const eventEndTime = endTime ? new Date(endTime) : existingEvent.endTime;
            const duration = eventEndTime ? Math.ceil((eventEndTime.getTime() - eventStartTime.getTime()) / 60000) : 60;

            const meeting = await zoomService.createMeeting({
              topic: title || existingEvent.title,
              startTime: eventStartTime,
              duration,
              timezone: timezone || existingEvent.timezone || "America/New_York",
              agenda: description || existingEvent.description || "",
            });

            zoomMeetingId = String(meeting.id);
            zoomJoinUrlValue = meeting.join_url;
            zoomStartUrl = meeting.start_url;
            zoomPasscode = meeting.password;
          } catch (e) {
            console.error("Failed to create Zoom meeting:", e);
            return res.status(500).json({ error: "Failed to create Zoom meeting" });
          }
        } else {
          return res.status(400).json({ error: "Zoom API not configured" });
        }
      }

      const [event] = await db.update(schema.foundryEvents)
        .set({
          title,
          description,
          eventType,
          startTime: startTime ? new Date(startTime) : undefined,
          endTime: endTime ? new Date(endTime) : undefined,
          timezone,
          capacity,
          zoomMeetingId,
          zoomJoinUrl: zoomJoinUrlValue,
          zoomStartUrl,
          zoomPasscode,
          updatedAt: new Date(),
        })
        .where(eq(schema.foundryEvents.id, eventId))
        .returning();

      res.json(event);
    } catch (error) {
      console.error("Failed to update event:", error);
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  // Delete event (admin only)
  app.delete("/api/foundry/events/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Check if user is admin
      const [admin] = await db.select()
        .from(schema.userRoles)
        .where(and(
          eq(schema.userRoles.userId, req.session.userId),
          eq(schema.userRoles.role, "admin")
        ));

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const eventId = parseInt(req.params.id);

      // Delete Zoom meeting if exists
      const [event] = await db.select()
        .from(schema.foundryEvents)
        .where(eq(schema.foundryEvents.id, eventId));

      if (event?.zoomMeetingId) {
        const { zoomService } = await import("./services/zoom");
        if (zoomService.isConfigured()) {
          try {
            await zoomService.deleteMeeting(event.zoomMeetingId);
          } catch (e) {
            console.error("Failed to delete Zoom meeting:", e);
          }
        }
      }

      await db.delete(schema.foundryEvents)
        .where(eq(schema.foundryEvents.id, eventId));

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete event:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // Cancel event (admin only) - marks as cancelled and sends notification emails
  app.post("/api/foundry/events/:id/cancel", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Check if user is admin
      const [admin] = await db.select()
        .from(schema.userRoles)
        .where(and(
          eq(schema.userRoles.userId, req.session.userId),
          eq(schema.userRoles.role, "admin")
        ));

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const eventId = parseInt(req.params.id);
      const { customMessage } = req.body;

      // Get the event
      const [event] = await db.select()
        .from(schema.foundryEvents)
        .where(eq(schema.foundryEvents.id, eventId));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Mark event as cancelled
      await db.update(schema.foundryEvents)
        .set({ isCancelled: true, updatedAt: new Date() })
        .where(eq(schema.foundryEvents.id, eventId));

      // Get all users who RSVPed as "going"
      const rsvps = await db.select({
        userId: schema.eventRsvps.userId,
        email: schema.users.email,
        fullName: schema.users.fullName,
      })
        .from(schema.eventRsvps)
        .innerJoin(schema.users, eq(schema.eventRsvps.userId, schema.users.id))
        .where(and(
          eq(schema.eventRsvps.eventId, eventId),
          eq(schema.eventRsvps.status, "going")
        ));

      // Send cancellation emails
      let sentCount = 0;
      const { sendEmail } = await import("./services/email");
      const eventDate = new Date(event.startTime).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      for (const rsvp of rsvps) {
        try {
          await sendEmail({
            to: rsvp.email,
            subject: `Event Cancelled: ${event.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Event Cancelled</h2>
                <p>Hi ${rsvp.fullName || "there"},</p>
                <p>We regret to inform you that the following event has been cancelled:</p>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <h3 style="margin: 0 0 8px 0;">${event.title}</h3>
                  <p style="margin: 0; color: #666;">Originally scheduled for: ${eventDate}</p>
                </div>
                ${customMessage ? `<div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;"><p style="margin: 0;"><strong>Message from organizer:</strong></p><p style="margin: 8px 0 0 0;">${customMessage}</p></div>` : ""}
                <p>We apologize for any inconvenience.</p>
                <p>Best regards,<br>The Yassu Team</p>
              </div>
            `,
          });
          sentCount++;
        } catch (e) {
          console.error("Failed to send cancellation email to", rsvp.email, e);
        }
      }

      res.json({ success: true, sentCount });
    } catch (error) {
      console.error("Failed to cancel event:", error);
      res.status(500).json({ error: "Failed to cancel event" });
    }
  });

  // Send event update notification (admin only)
  app.post("/api/foundry/events/:id/notify-update", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Check if user is admin
      const [admin] = await db.select()
        .from(schema.userRoles)
        .where(and(
          eq(schema.userRoles.userId, req.session.userId),
          eq(schema.userRoles.role, "admin")
        ));

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const eventId = parseInt(req.params.id);
      const { customMessage, changes } = req.body;

      // Get the event
      const [event] = await db.select()
        .from(schema.foundryEvents)
        .where(eq(schema.foundryEvents.id, eventId));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Get all users who RSVPed as "going"
      const rsvps = await db.select({
        userId: schema.eventRsvps.userId,
        email: schema.users.email,
        fullName: schema.users.fullName,
      })
        .from(schema.eventRsvps)
        .innerJoin(schema.users, eq(schema.eventRsvps.userId, schema.users.id))
        .where(and(
          eq(schema.eventRsvps.eventId, eventId),
          eq(schema.eventRsvps.status, "going")
        ));

      // Send update emails
      let sentCount = 0;
      const { sendEmail } = await import("./services/email");
      const eventDate = new Date(event.startTime).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      for (const rsvp of rsvps) {
        try {
          await sendEmail({
            to: rsvp.email,
            subject: `Event Update: ${event.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #7c3aed;">Event Updated</h2>
                <p>Hi ${rsvp.fullName || "there"},</p>
                <p>There has been an update to an event you're attending:</p>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <h3 style="margin: 0 0 8px 0;">${event.title}</h3>
                  <p style="margin: 0; color: #666;">Date: ${eventDate}</p>
                  ${event.zoomJoinUrl ? `<p style="margin: 8px 0 0 0;"><a href="${event.zoomJoinUrl}" style="color: #7c3aed;">Join Zoom Meeting</a></p>` : ""}
                </div>
                ${changes ? `<div style="background: #e0f2fe; padding: 16px; border-radius: 8px; margin: 16px 0;"><p style="margin: 0;"><strong>What changed:</strong></p><p style="margin: 8px 0 0 0;">${changes}</p></div>` : ""}
                ${customMessage ? `<div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;"><p style="margin: 0;"><strong>Message from organizer:</strong></p><p style="margin: 8px 0 0 0;">${customMessage}</p></div>` : ""}
                <p>Best regards,<br>The Yassu Team</p>
              </div>
            `,
          });
          sentCount++;
        } catch (e) {
          console.error("Failed to send update email to", rsvp.email, e);
        }
      }

      res.json({ success: true, sentCount });
    } catch (error) {
      console.error("Failed to send event update notifications:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  // RSVP to event
  app.post("/api/foundry/events/:id/rsvp", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const eventId = parseInt(req.params.id);
      const { status } = req.body;

      if (!["going", "maybe", "not_going"].includes(status)) {
        return res.status(400).json({ error: "Invalid RSVP status" });
      }

      // Check if event exists
      const [event] = await db.select()
        .from(schema.foundryEvents)
        .where(eq(schema.foundryEvents.id, eventId));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Check capacity if going
      if (status === "going" && event.capacity) {
        const goingCount = await db.select()
          .from(schema.eventRsvps)
          .where(and(
            eq(schema.eventRsvps.eventId, eventId),
            eq(schema.eventRsvps.status, "going")
          ));

        if (goingCount.length >= event.capacity) {
          return res.status(400).json({ error: "Event is at capacity" });
        }
      }

      // Upsert RSVP
      const existingRsvp = await db.select()
        .from(schema.eventRsvps)
        .where(and(
          eq(schema.eventRsvps.eventId, eventId),
          eq(schema.eventRsvps.userId, req.session.userId)
        ));

      if (existingRsvp.length > 0) {
        await db.update(schema.eventRsvps)
          .set({ status, updatedAt: new Date() })
          .where(eq(schema.eventRsvps.id, existingRsvp[0].id));
      } else {
        await db.insert(schema.eventRsvps).values({
          eventId,
          userId: req.session.userId,
          status,
        });
      }

      res.json({ success: true, status });
    } catch (error) {
      console.error("Failed to RSVP:", error);
      res.status(500).json({ error: "Failed to RSVP" });
    }
  });

  // Get users eligible for event invites (admin only)
  app.get("/api/foundry/events/:id/invite-users", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Check if user is admin
      const [admin] = await db.select()
        .from(schema.userRoles)
        .where(and(
          eq(schema.userRoles.userId, req.session.userId),
          eq(schema.userRoles.role, "admin")
        ));

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get all users with email notifications enabled
      const eligibleUsers = await db.select({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.profiles.fullName,
      })
        .from(schema.users)
        .innerJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
        .where(eq(schema.profiles.emailNotificationsEnabled, true));

      res.json(eligibleUsers);
    } catch (error) {
      console.error("Failed to get invite users:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  // Send event invite emails (admin only)
  app.post("/api/foundry/events/:id/send-invites", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Check if user is admin
      const [admin] = await db.select()
        .from(schema.userRoles)
        .where(and(
          eq(schema.userRoles.userId, req.session.userId),
          eq(schema.userRoles.role, "admin")
        ));

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const eventId = parseInt(req.params.id);
      const { excludedUserIds = [] } = req.body;

      // Get event
      const [event] = await db.select()
        .from(schema.foundryEvents)
        .where(eq(schema.foundryEvents.id, eventId));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Get all users with email notifications enabled (respecting preferences)
      const allUsers = await db.select({
        id: schema.users.id,
        email: schema.users.email,
        fullName: schema.profiles.fullName,
      })
        .from(schema.users)
        .innerJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
        .where(eq(schema.profiles.emailNotificationsEnabled, true));

      // Filter out excluded users
      const usersToNotify = allUsers.filter(u => !excludedUserIds.includes(u.id));

      const eventDate = new Date(event.startTime).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const eventTime = new Date(event.startTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      let sentCount = 0;
      for (const user of usersToNotify) {
        if (!user.email) continue;
        
        try {
          const { sendEmail } = await import('./email');
          await sendEmail({
            to: user.email,
            subject: `You're Invited: ${event.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #7c3aed;">You're Invited to a Yassu Foundry Event!</h2>
                <h3>${event.title}</h3>
                <p><strong>Date:</strong> ${eventDate}</p>
                <p><strong>Time:</strong> ${eventTime}</p>
                ${event.description ? `<p>${event.description}</p>` : ''}
                ${event.zoomJoinUrl ? `
                  <p style="margin-top: 20px;">
                    <a href="${event.zoomJoinUrl}" 
                       style="background-color: #7c3aed; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                      Join Zoom Meeting
                    </a>
                  </p>
                ` : ''}
                <p style="margin-top: 20px;">
                  <a href="https://yassu.ai/portal/foundry" 
                     style="color: #7c3aed;">View all events and RSVP</a>
                </p>
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 12px; color: #666;">
                  This email was sent by Yassu. You can manage your notification preferences in Settings.
                </p>
              </div>
            `,
            emailType: 'other',
          });
          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send email to ${user.email}:`, emailError);
        }
      }

      res.json({ success: true, sentCount });
    } catch (error) {
      console.error("Failed to send invites:", error);
      res.status(500).json({ error: "Failed to send invites" });
    }
  });

  // Check if Zoom is configured
  app.get("/api/foundry/zoom-status", async (req: Request, res: Response) => {
    const { zoomService } = await import("./services/zoom");
    res.json({ configured: zoomService.isConfigured() });
  });

  // Send reminder to users who RSVPed "going"
  app.post("/api/foundry/events/:id/send-reminder", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Check if user is admin
      const [admin] = await db.select()
        .from(schema.userRoles)
        .where(and(
          eq(schema.userRoles.userId, req.session.userId),
          eq(schema.userRoles.role, "admin")
        ));

      if (!admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const eventId = parseInt(req.params.id);

      // Get event
      const [event] = await db.select()
        .from(schema.foundryEvents)
        .where(eq(schema.foundryEvents.id, eventId));

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Get users who RSVPed "going" and have notifications enabled
      const goingRsvps = await db.select({
        email: schema.users.email,
        fullName: schema.profiles.fullName,
      })
        .from(schema.eventRsvps)
        .innerJoin(schema.users, eq(schema.eventRsvps.userId, schema.users.id))
        .innerJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
        .where(and(
          eq(schema.eventRsvps.eventId, eventId),
          eq(schema.eventRsvps.status, "going"),
          eq(schema.profiles.emailNotificationsEnabled, true)
        ));

      if (goingRsvps.length === 0) {
        return res.json({ success: true, sentCount: 0, message: "No users to remind" });
      }

      const eventDate = new Date(event.startTime).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const eventTime = new Date(event.startTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      let sentCount = 0;
      for (const user of goingRsvps) {
        if (!user.email) continue;
        
        try {
          const { sendEmail } = await import('./email');
          await sendEmail({
            to: user.email,
            subject: `Reminder: ${event.title} is coming up!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #7c3aed;">Event Reminder</h2>
                <p>Hi ${user.fullName || 'there'},</p>
                <p>This is a friendly reminder about the upcoming Yassu Foundry event you RSVPed to:</p>
                <h3>${event.title}</h3>
                <p><strong>Date:</strong> ${eventDate}</p>
                <p><strong>Time:</strong> ${eventTime}</p>
                ${event.description ? `<p>${event.description}</p>` : ''}
                ${event.zoomJoinUrl ? `
                  <p style="margin-top: 20px;">
                    <a href="${event.zoomJoinUrl}" 
                       style="background-color: #7c3aed; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                      Join Zoom Meeting
                    </a>
                  </p>
                ` : ''}
                <p style="margin-top: 20px;">We're looking forward to seeing you there!</p>
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 12px; color: #666;">
                  This email was sent by Yassu. You can manage your notification preferences in Settings.
                </p>
              </div>
            `,
            emailType: 'other',
          });
          sentCount++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${user.email}:`, emailError);
        }
      }

      res.json({ success: true, sentCount });
    } catch (error) {
      console.error("Failed to send reminders:", error);
      res.status(500).json({ error: "Failed to send reminders" });
    }
  });

  // ============================================
  // ROADSHOW BOOKING ENDPOINTS
  // ============================================

  // Get user's roadshow bookings
  app.get("/api/roadshow-bookings", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const bookings = await db.select({
        id: schema.roadshowBookings.id,
        ideaId: schema.roadshowBookings.ideaId,
        ideaTitle: schema.ideas.title,
        eventId: schema.roadshowBookings.eventId,
        eventTitle: schema.foundryEvents.title,
        eventStartTime: schema.foundryEvents.startTime,
        pitchDuration: schema.roadshowBookings.pitchDuration,
        message: schema.roadshowBookings.message,
        status: schema.roadshowBookings.status,
        adminNotes: schema.roadshowBookings.adminNotes,
        createdAt: schema.roadshowBookings.createdAt,
      })
        .from(schema.roadshowBookings)
        .innerJoin(schema.ideas, eq(schema.roadshowBookings.ideaId, schema.ideas.id))
        .leftJoin(schema.foundryEvents, eq(schema.roadshowBookings.eventId, schema.foundryEvents.id))
        .where(eq(schema.roadshowBookings.userId, req.session.userId))
        .orderBy(desc(schema.roadshowBookings.createdAt));

      res.json(bookings);
    } catch (error) {
      console.error("Get roadshow bookings error:", error);
      res.status(500).json({ error: "Failed to get bookings" });
    }
  });

  // Create a roadshow booking request
  app.post("/api/roadshow-bookings", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { ideaId, eventId, pitchDuration, message } = req.body;

      if (!ideaId) {
        return res.status(400).json({ error: "Idea ID is required" });
      }

      // Check if user owns or is a team member of this idea
      const [idea] = await db.select()
        .from(schema.ideas)
        .where(eq(schema.ideas.id, ideaId));

      if (!idea) {
        return res.status(404).json({ error: "Idea not found" });
      }

      if (idea.creatorId !== req.session.userId) {
        // Check if user is a team member
        const [teamMember] = await db.select()
          .from(schema.teamMembers)
          .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
          .where(and(
            eq(schema.teams.ideaId, ideaId),
            eq(schema.teamMembers.userId, req.session.userId)
          ));

        if (!teamMember) {
          return res.status(403).json({ error: "You must be the idea creator or team member to book a roadshow" });
        }
      }

      // Check for existing pending booking
      const [existingBooking] = await db.select()
        .from(schema.roadshowBookings)
        .where(and(
          eq(schema.roadshowBookings.ideaId, ideaId),
          eq(schema.roadshowBookings.status, "pending")
        ));

      if (existingBooking) {
        return res.status(400).json({ error: "A pending booking request already exists for this idea" });
      }

      // Create booking
      const [booking] = await db.insert(schema.roadshowBookings)
        .values({
          ideaId,
          userId: req.session.userId,
          eventId: eventId || null,
          pitchDuration: pitchDuration || 10,
          message: message || null,
          status: "pending",
        })
        .returning();

      res.json(booking);
    } catch (error) {
      console.error("Create roadshow booking error:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Cancel a roadshow booking
  app.delete("/api/roadshow-bookings/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const bookingId = parseInt(req.params.id);

      const [booking] = await db.select()
        .from(schema.roadshowBookings)
        .where(eq(schema.roadshowBookings.id, bookingId));

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.userId !== req.session.userId) {
        return res.status(403).json({ error: "Not authorized to cancel this booking" });
      }

      if (booking.status !== "pending") {
        return res.status(400).json({ error: "Can only cancel pending bookings" });
      }

      await db.update(schema.roadshowBookings)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(schema.roadshowBookings.id, bookingId));

      res.json({ success: true });
    } catch (error) {
      console.error("Cancel roadshow booking error:", error);
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });

  // Admin: Get all roadshow bookings
  app.get("/api/admin/roadshow-bookings", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const bookings = await db.select({
        id: schema.roadshowBookings.id,
        ideaId: schema.roadshowBookings.ideaId,
        ideaTitle: schema.ideas.title,
        userId: schema.roadshowBookings.userId,
        userFullName: schema.profiles.fullName,
        userEmail: schema.users.email,
        eventId: schema.roadshowBookings.eventId,
        eventTitle: schema.foundryEvents.title,
        eventStartTime: schema.foundryEvents.startTime,
        pitchDuration: schema.roadshowBookings.pitchDuration,
        message: schema.roadshowBookings.message,
        status: schema.roadshowBookings.status,
        adminNotes: schema.roadshowBookings.adminNotes,
        reviewedBy: schema.roadshowBookings.reviewedBy,
        reviewedAt: schema.roadshowBookings.reviewedAt,
        createdAt: schema.roadshowBookings.createdAt,
      })
        .from(schema.roadshowBookings)
        .innerJoin(schema.ideas, eq(schema.roadshowBookings.ideaId, schema.ideas.id))
        .innerJoin(schema.users, eq(schema.roadshowBookings.userId, schema.users.id))
        .innerJoin(schema.profiles, eq(schema.users.id, schema.profiles.userId))
        .leftJoin(schema.foundryEvents, eq(schema.roadshowBookings.eventId, schema.foundryEvents.id))
        .orderBy(desc(schema.roadshowBookings.createdAt));

      res.json(bookings);
    } catch (error) {
      console.error("Get admin roadshow bookings error:", error);
      res.status(500).json({ error: "Failed to get bookings" });
    }
  });

  // Admin: Update roadshow booking status
  app.patch("/api/admin/roadshow-bookings/:id", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const bookingId = parseInt(req.params.id);
      const { status, adminNotes, eventId } = req.body;

      const [booking] = await db.select()
        .from(schema.roadshowBookings)
        .where(eq(schema.roadshowBookings.id, bookingId));

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const updateData: any = {
        updatedAt: new Date(),
        reviewedBy: req.session.userId,
        reviewedAt: new Date(),
      };

      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      if (eventId !== undefined) updateData.eventId = eventId;

      const [updated] = await db.update(schema.roadshowBookings)
        .set(updateData)
        .where(eq(schema.roadshowBookings.id, bookingId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Update roadshow booking error:", error);
      res.status(500).json({ error: "Failed to update booking" });
    }
  });

  // Admin: Approve roadshow booking
  app.post("/api/admin/roadshow-bookings/:id/approve", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const bookingId = parseInt(req.params.id);
      const { adminNotes } = req.body;

      const [booking] = await db.select()
        .from(schema.roadshowBookings)
        .where(eq(schema.roadshowBookings.id, bookingId));

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const [updated] = await db.update(schema.roadshowBookings)
        .set({
          status: 'approved',
          adminNotes: adminNotes || null,
          reviewedBy: req.session.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.roadshowBookings.id, bookingId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Approve roadshow booking error:", error);
      res.status(500).json({ error: "Failed to approve booking" });
    }
  });

  // Admin: Reject roadshow booking
  app.post("/api/admin/roadshow-bookings/:id/reject", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const bookingId = parseInt(req.params.id);
      const { adminNotes } = req.body;

      const [booking] = await db.select()
        .from(schema.roadshowBookings)
        .where(eq(schema.roadshowBookings.id, bookingId));

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const [updated] = await db.update(schema.roadshowBookings)
        .set({
          status: 'rejected',
          adminNotes: adminNotes || null,
          reviewedBy: req.session.userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.roadshowBookings.id, bookingId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Reject roadshow booking error:", error);
      res.status(500).json({ error: "Failed to reject booking" });
    }
  });

  // ============ Group Routes ============

  app.get("/api/my-group-applications", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const applications = await storage.getUserApplications(req.session.userId);
      res.json(applications);
    } catch (error) {
      console.error("Get user applications error:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.get("/api/groups/my-memberships", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const groups = await storage.getUserGroups(req.session.userId);
      res.json(groups.map(g => ({ id: g.id, name: g.name, slug: g.slug, role: g.role })));
    } catch (error) {
      console.error("Get user memberships error:", error);
      res.status(500).json({ error: "Failed to fetch memberships" });
    }
  });

  app.get("/api/groups/my-groups", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (isSuperAdmin) {
        const allGroups = await storage.getGroups();
        const userGroups = await storage.getUserGroups(req.session.userId);
        const result = allGroups.map(g => {
          const membership = userGroups.find(ug => ug.id === g.id);
          return {
            id: g.id,
            name: g.name,
            slug: g.slug,
            role: membership?.role || 'admin',
          };
        });
        return res.json(result);
      }
      const groups = await storage.getUserGroups(req.session.userId);
      const adminGroups = groups.filter(g => g.role === 'owner' || g.role === 'admin' || g.role === 'judge');
      res.json(adminGroups);
    } catch (error) {
      console.error("Get user groups error:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  app.get("/api/groups", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
    try {
      const groups = await storage.getGroups();
      const groupsWithStats = await Promise.all(
        groups.map(async (g) => {
          const stats = await storage.getGroupStats(g.id);
          return { ...g, ...stats };
        })
      );
      res.json(groupsWithStats);
    } catch (error) {
      console.error("Get groups error:", error);
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  app.post("/api/groups", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) return res.status(403).json({ error: "Admin access required" });
    try {
      const { name, slug, description, primaryColor, accentColor, universityId } = req.body;
      if (!name || !slug) return res.status(400).json({ error: "Name and slug are required" });

      const existing = await storage.getGroupBySlug(slug);
      if (existing) return res.status(409).json({ error: "A group with this slug already exists" });

      const group = await storage.createGroup({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        description,
        primaryColor,
        accentColor,
        universityId: universityId || null,
        createdBy: req.session.userId,
      });

      await storage.addGroupMember(group.id, req.session.userId, 'owner');
      res.status(201).json(group);
    } catch (error) {
      console.error("Create group error:", error);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.get("/api/groups/:slug/details", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      const allMembers = await storage.getGroupMembers(group.id);
      const isJudge = allMembers.some(m => m.userId === req.session.userId && m.role === 'judge');
      if (!isAdmin && !isSuperAdmin && !isJudge) return res.status(403).json({ error: "Group admin access required" });

      const stats = await storage.getGroupStats(group.id);
      res.json({ ...group, ...stats });
    } catch (error) {
      console.error("Get group details error:", error);
      res.status(500).json({ error: "Failed to fetch group details" });
    }
  });

  app.get("/api/groups/:slug/members", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      const members = await storage.getGroupMembers(group.id);
      const isJudge = members.some(m => m.userId === req.session.userId && m.role === 'judge');
      if (!isAdmin && !isSuperAdmin && !isJudge) return res.status(403).json({ error: "Group admin access required" });

      res.json(members.map(m => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        fullName: m.user.fullName,
        email: m.user.email,
        avatarUrl: m.profile?.avatarUrl || null,
        university: m.profile?.universityId || null,
      })));
    } catch (error) {
      console.error("Get group members error:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.patch("/api/groups/:slug/members/:userId/role", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isGroupAdminUser = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isGroupAdminUser && !isSuperAdmin) return res.status(403).json({ error: "Group admin access required" });

      const { role } = req.body;
      if (!['admin', 'member', 'judge'].includes(role)) return res.status(400).json({ error: "Invalid role. Only 'admin', 'member', or 'judge' can be assigned." });

      const targetUserId = parseInt(req.params.userId);

      const members = await storage.getGroupMembers(group.id);
      const targetMember = members.find(m => m.userId === targetUserId);
      if (!targetMember) return res.status(404).json({ error: "Member not found" });
      if (targetMember.role === 'owner') return res.status(403).json({ error: "Cannot change the role of a group owner" });

      const updated = await storage.updateGroupMemberRole(group.id, targetUserId, role);
      if (!updated) return res.status(404).json({ error: "Member not found" });
      res.json(updated);
    } catch (error) {
      console.error("Update member role error:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  app.delete("/api/groups/:slug/members/:userId", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin && !isSuperAdmin) return res.status(403).json({ error: "Group admin access required" });

      const targetUserId = parseInt(req.params.userId);
      if (targetUserId === req.session.userId) return res.status(400).json({ error: "Cannot remove yourself" });

      const members = await storage.getGroupMembers(group.id);
      const targetMember = members.find(m => m.userId === targetUserId);
      if (!targetMember) return res.status(404).json({ error: "Member not found" });
      if (targetMember.role === 'owner') return res.status(403).json({ error: "Cannot remove a group owner" });

      await storage.removeGroupMember(group.id, targetUserId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove member error:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  app.patch("/api/groups/:slug", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isGroupAdminUser = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isGroupAdminUser && !isSuperAdmin) return res.status(403).json({ error: "Group admin access required" });

      if (req.body.redirectUrl && typeof req.body.redirectUrl === 'string' && req.body.redirectUrl.trim() !== '') {
        try {
          const parsed = new URL(req.body.redirectUrl);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return res.status(400).json({ error: "Redirect URL must use http or https" });
          }
        } catch {
          return res.status(400).json({ error: "Invalid redirect URL" });
        }
      }

      const allowedFields = ['name', 'description', 'primaryColor', 'accentColor', 'universityId', 'redirectUrl', 'submissionMessage', 'submissionFileUrl'];
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: "No valid fields to update" });

      const updated = await storage.updateGroup(group.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Update group error:", error);
      res.status(500).json({ error: "Failed to update group" });
    }
  });

  app.delete("/api/groups/:slug", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isSuperAdmin) return res.status(403).json({ error: "Super admin access required" });

      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      await storage.deleteGroup(group.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete group error:", error);
      res.status(500).json({ error: "Failed to delete group" });
    }
  });

  app.post("/api/groups/:slug/transfer-ownership", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      const members = await storage.getGroupMembers(group.id);
      const currentOwner = members.find(m => m.role === 'owner');
      const isOwner = currentOwner && currentOwner.userId === req.session.userId;
      if (!isOwner && !isSuperAdmin) return res.status(403).json({ error: "Only the group owner or super admin can transfer ownership" });

      const { newOwnerId } = req.body;
      if (!newOwnerId) return res.status(400).json({ error: "New owner ID required" });

      const newOwnerMember = members.find(m => m.userId === newOwnerId);
      if (!newOwnerMember) return res.status(400).json({ error: "New owner must be a current group member" });

      if (!currentOwner) return res.status(400).json({ error: "No current owner found" });

      await storage.transferGroupOwnership(group.id, currentOwner.userId, newOwnerId);
      res.json({ success: true });
    } catch (error) {
      console.error("Transfer ownership error:", error);
      res.status(500).json({ error: "Failed to transfer ownership" });
    }
  });

  app.delete("/api/groups/:slug/invites/:inviteId", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isGroupAdminUser = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isGroupAdminUser && !isSuperAdmin) return res.status(403).json({ error: "Admin access required" });

      await storage.revokeGroupInvite(req.params.inviteId, group.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Revoke invite error:", error);
      res.status(500).json({ error: "Failed to revoke invite" });
    }
  });

  app.post("/api/groups/:slug/invites/:inviteId/resend", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isGroupAdminUser = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isGroupAdminUser && !isSuperAdmin) return res.status(403).json({ error: "Admin access required" });

      const invites = await storage.getGroupInvites(group.id);
      const invite = invites.find(i => i.id === req.params.inviteId);
      if (!invite) return res.status(404).json({ error: "Invite not found" });
      if (invite.status !== 'pending') return res.status(400).json({ error: "Can only resend pending invites" });

      const { getBrandedUrl, sendEmail } = await import('./email');
      const inviteUrl = getBrandedUrl(`/accept-group-invite?token=${invite.token}`, group.slug);

      await sendEmail({
        to: invite.email,
        subject: `Reminder: You're invited to join ${group.name} on Yassu`,
        html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2>Join ${group.name}</h2>
          <p>This is a reminder that you've been invited to join <strong>${group.name}</strong> on Yassu.</p>
          <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#7C5CFC;color:#fff;border-radius:8px;text-decoration:none;margin-top:16px">Accept Invitation</a>
        </div>`,
        emailType: 'group_invite',
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Resend invite error:", error);
      res.status(500).json({ error: "Failed to resend invite" });
    }
  });

  app.get("/api/groups/:slug/ideas", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin && !isSuperAdmin) return res.status(403).json({ error: "Group admin access required" });

      const ideas = await storage.getGroupIdeas(group.id);
      const ideasWithCreators = await Promise.all(
        ideas.map(async (idea) => {
          const creator = await storage.getUser(idea.createdBy);
          return { ...idea, creatorName: creator?.fullName || null };
        })
      );
      res.json(ideasWithCreators);
    } catch (error) {
      console.error("Get group ideas error:", error);
      res.status(500).json({ error: "Failed to fetch ideas" });
    }
  });

  app.get("/api/groups/:slug/invites", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin && !isSuperAdmin) return res.status(403).json({ error: "Group admin access required" });

      const allInvites = await storage.getGroupInvites(group.id);
      const userInvites = allInvites.filter(i => i.invitedBy === req.session.userId);
      const sanitized = userInvites.map(({ token, ...rest }) => rest);
      res.json(sanitized);
    } catch (error) {
      console.error("Get group invites error:", error);
      res.status(500).json({ error: "Failed to fetch invites" });
    }
  });

  app.post("/api/groups/:slug/invite", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin && !isSuperAdmin) return res.status(403).json({ error: "Group admin access required" });

      const { emails } = req.body;
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: "At least one email is required" });
      }

      const inviter = await storage.getUser(req.session.userId);
      const inviterName = inviter?.fullName || 'A group admin';

      const results: { email: string; status: string }[] = [];
      const { sendGroupInviteEmail, getBrandedUrl } = await import('./email');
      const crypto = await import('crypto');

      for (const email of emails) {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
          results.push({ email: trimmedEmail, status: 'invalid' });
          continue;
        }

        try {
          const token = crypto.randomBytes(32).toString('hex');
          await storage.createGroupInvite({
            groupId: group.id,
            email: trimmedEmail,
            invitedBy: req.session.userId,
            status: 'pending',
            token,
          });

          const existingUser = await storage.getUserByEmail(trimmedEmail);
          let acceptUrl: string;
          if (existingUser) {
            acceptUrl = getBrandedUrl(`/accept-group-invite?token=${token}`, group.slug);
          } else {
            acceptUrl = getBrandedUrl(`/auth?mode=signup&invite=${token}`, group.slug);
          }
          await sendGroupInviteEmail(trimmedEmail, group.name, inviterName, acceptUrl);
          results.push({ email: trimmedEmail, status: 'sent' });
        } catch (err) {
          console.error(`Failed to invite ${trimmedEmail}:`, err);
          results.push({ email: trimmedEmail, status: 'failed' });
        }
      }

      res.json({ results, totalSent: results.filter(r => r.status === 'sent').length });
    } catch (error) {
      console.error("Group invite error:", error);
      res.status(500).json({ error: "Failed to send invites" });
    }
  });

  app.post("/api/groups/accept-invite", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: "Token is required" });

      const invite = await storage.getGroupInviteByToken(token);
      if (!invite) return res.status(404).json({ error: "Invite not found" });
      if (invite.status !== 'pending') return res.status(400).json({ error: "Invite already used" });

      const user = await storage.getUser(req.session.userId);
      if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
        return res.status(403).json({ error: "This invitation was sent to a different email address. Please sign in with the invited email." });
      }

      await storage.acceptGroupInvite(token, req.session.userId);
      res.json({ success: true, groupSlug: invite.group.slug, groupName: invite.group.name });
    } catch (error) {
      console.error("Accept group invite error:", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });

  app.get("/api/groups/:slug/applications", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin && !isSuperAdmin) return res.status(403).json({ error: "Group admin access required" });

      const applications = await storage.getGroupApplications(group.id);
      res.json(applications.filter(a => a.status !== 'draft'));
    } catch (error) {
      console.error("Get group applications error:", error);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  app.post("/api/groups/:slug/apply", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const existingApp = await storage.getUserApplicationForGroup(req.session.userId, group.id);
      if (existingApp && (existingApp.status === 'pending' || existingApp.status === 'approved')) {
        return res.status(400).json({ error: "You already have an application for this group" });
      }

      const { motivation, asDraft } = req.body;

      if (existingApp && existingApp.status === 'draft') {
        if (asDraft) {
          return res.json(existingApp);
        }
        const { db } = await import('./db');
        const { sql } = await import('drizzle-orm');
        await db.execute(sql`UPDATE group_applications SET motivation = ${motivation || ''}, status = 'pending', reviewed_by = NULL, reviewed_at = NULL WHERE id = ${existingApp.id}`);
        const updated = await storage.getUserApplicationForGroup(req.session.userId, group.id);
        return res.json(updated);
      }

      if (existingApp) {
        return res.json(existingApp);
      }

      const application = await storage.createGroupApplication({
        groupId: group.id,
        userId: req.session.userId,
        motivation: motivation || null,
        status: asDraft ? 'draft' : 'pending',
        reviewedBy: null,
      });
      res.json(application);
    } catch (error) {
      console.error("Apply to group error:", error);
      res.status(500).json({ error: "Failed to submit application" });
    }
  });

  app.get("/api/groups/:slug/my-application", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const application = await storage.getUserApplicationForGroup(req.session.userId, group.id);
      res.json({
        application: application || null,
        group: {
          name: group.name,
          slug: group.slug,
          description: group.description,
          logoUrl: (group as any).logoUrl || null,
          primaryColor: (group as any).primaryColor || null,
          applicationQuestions: (group as any).applicationQuestions || [],
        },
      });
    } catch (error) {
      console.error("Get user application error:", error);
      res.status(500).json({ error: "Failed to fetch application" });
    }
  });

  app.patch("/api/groups/:slug/my-application", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const application = await storage.getUserApplicationForGroup(req.session.userId, group.id);
      if (!application) return res.status(404).json({ error: "No application found" });
      if (application.status !== 'draft' && application.status !== 'pending') return res.status(400).json({ error: "Only draft or pending applications can be edited" });

      const { answers, projectTitle, universityName, graduationYear, major, teamEmails } = req.body;
      if (!Array.isArray(answers)) return res.status(400).json({ error: "Answers must be an array" });

      const normalizedTeamEmails = Array.isArray(teamEmails) ? teamEmails.map((e: string) => e.trim().toLowerCase()).filter(Boolean) : undefined;
      const motivation = answers.map((a: { question: string; answer: string }) => `${a.question}: ${a.answer}`).join('\n\n');
      const updated = await storage.updateGroupApplicationAnswers(application.id, answers, motivation, projectTitle, normalizedTeamEmails, {
        universityName: typeof universityName === 'string' ? universityName.trim() || undefined : undefined,
        graduationYear: typeof graduationYear === 'string' ? graduationYear.trim() || undefined : undefined,
        major: typeof major === 'string' ? major.trim() || undefined : undefined,
      });

      if (application.status === 'pending') {
        try {
          const editor = await storage.getUser(req.session.userId);
          const members = await storage.getGroupMembers(group.id);
          const adminsAndOwners = members.filter(m => m.role === 'admin' || m.role === 'owner');
          for (const admin of adminsAndOwners) {
            await storage.createNotification({
              userId: admin.userId,
              type: 'group_application',
              title: 'Application Updated',
              message: `${editor?.fullName || editor?.email || 'A user'} updated their application for ${group.name}.`,
              link: '/portal/group-admin',
            });
          }
        } catch (notifErr) {
          console.error("Failed to notify admins about application edit:", notifErr);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Save draft application error:", error);
      res.status(500).json({ error: "Failed to save application" });
    }
  });

  app.post("/api/groups/:slug/my-application/submit", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const application = await storage.getUserApplicationForGroup(req.session.userId, group.id);
      if (!application) return res.status(404).json({ error: "No application found" });
      if (application.status !== 'draft') return res.status(400).json({ error: "Only draft applications can be submitted" });

      const configuredQuestions = (group as any).applicationQuestions as { label: string; type: string; required: boolean }[] | null;
      const currentAnswers = (application.answers || []) as { question: string; answer: string }[];
      if (configuredQuestions && configuredQuestions.length > 0) {
        for (let i = 0; i < configuredQuestions.length; i++) {
          const q = configuredQuestions[i];
          const a = currentAnswers[i];
          if (q.required && (!a || !a.answer?.trim())) {
            return res.status(400).json({ error: `"${q.label}" is required` });
          }
        }
      }

      const { db } = await import('./db');
      const { sql } = await import('drizzle-orm');
      await db.execute(sql`UPDATE group_applications SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL WHERE id = ${application.id}`);

      // Notify group admins/owners about the new application
      try {
        const applicant = await storage.getUser(req.session.userId);
        const applicantName = applicant?.fullName || applicant?.email || 'A user';
        const applicantEmail = applicant?.email || '';
        const members = await storage.getGroupMembers(group.id);
        const adminsAndOwners = members.filter(m => m.role === 'admin' || m.role === 'owner');
        for (const admin of adminsAndOwners) {
          await storage.createNotification({
            userId: admin.userId,
            type: 'group_application',
            title: 'New Application Submitted',
            message: `${applicantName} submitted an application to ${group.name}.`,
            link: '/portal/group-admin',
          });
        }

        // Send email notifications
        const { sendApplicationConfirmationEmail, sendAdminApplicationNotificationEmail, sendSuperAdminApplicationNotificationEmail } = await import('./email');

        if (applicantEmail) {
          sendApplicationConfirmationEmail(applicantEmail, applicantName, group.name)
            .catch(err => console.error(`[Submit] Failed to send confirmation email:`, err));
        }

        for (const admin of adminsAndOwners) {
          const adminUser = await storage.getUser(admin.userId);
          if (adminUser?.email) {
            sendAdminApplicationNotificationEmail(adminUser.email, adminUser.fullName || adminUser.email, applicantName, applicantEmail, group.name, group.slug)
              .catch(err => console.error(`[Submit] Failed to send admin notification:`, err));
          }
        }

        const superAdmins = await db.execute(sql`SELECT id, email, full_name FROM users WHERE is_superadmin = true`);
        const saRows = (superAdmins as any).rows || superAdmins;
        for (const sa of saRows) {
          if (sa.email) {
            sendSuperAdminApplicationNotificationEmail(sa.email, applicantName, applicantEmail, group.name)
              .catch(err => console.error(`[Submit] Failed to send super admin notification:`, err));
          }
        }
      } catch (notifErr) {
        console.error("Failed to notify about application:", notifErr);
      }

      // Notify the applicant in-app
      try {
        await storage.createNotification({
          userId: req.session.userId,
          type: 'group_application',
          title: 'Application Received',
          message: `Your application to ${group.name} has been received and is under review.`,
          link: `/portal/applications/${group.slug}`,
        });
      } catch (notifErr) {
        console.error("Failed to notify applicant about submission:", notifErr);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Submit application error:", error);
      res.status(500).json({ error: "Failed to submit application" });
    }
  });

  app.patch("/api/groups/:slug/applications/:applicationId", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin && !isSuperAdmin) return res.status(403).json({ error: "Group admin access required" });

      const { status } = req.body;
      if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });

      const allApps = await storage.getGroupApplications(group.id);
      const targetApp = allApps.find(a => a.id === req.params.applicationId);
      if (!targetApp) return res.status(404).json({ error: "Application not found in this group" });
      if (targetApp.status !== 'pending' && targetApp.status !== 'draft') return res.status(400).json({ error: "Application has already been reviewed" });

      const updated = await storage.updateGroupApplication(req.params.applicationId, status, req.session.userId);
      if (!updated) return res.status(404).json({ error: "Application not found" });

      if (status === 'approved') {
        await storage.addGroupMember(group.id, updated.userId, 'member');
      }

      res.json(updated);
    } catch (error) {
      console.error("Update application error:", error);
      res.status(500).json({ error: "Failed to update application" });
    }
  });

  app.get("/api/groups/:slug/ideas-with-ratings", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      const members = await storage.getGroupMembers(group.id);
      const isJudge = members.some(m => m.userId === req.session.userId && m.role === 'judge');
      if (!isAdmin && !isSuperAdmin && !isJudge) return res.status(403).json({ error: "Access required" });

      const ideas = await storage.getGroupIdeasWithRatings(group.id);
      res.json(ideas);
    } catch (error) {
      console.error("Get ideas with ratings error:", error);
      res.status(500).json({ error: "Failed to fetch ideas" });
    }
  });

  app.get("/api/groups/:slug/ideas/:ideaId/ratings", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      const members = await storage.getGroupMembers(group.id);
      const isJudge = members.some(m => m.userId === req.session.userId && m.role === 'judge');
      if (!isAdmin && !isSuperAdmin && !isJudge) return res.status(403).json({ error: "Access required" });

      const ratings = await storage.getIdeaRatings(req.params.ideaId, group.id);
      res.json(ratings);
    } catch (error) {
      console.error("Get idea ratings error:", error);
      res.status(500).json({ error: "Failed to fetch ratings" });
    }
  });

  app.post("/api/groups/:slug/ideas/:ideaId/rate", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      const members = await storage.getGroupMembers(group.id);
      const isJudge = members.some(m => m.userId === req.session.userId && m.role === 'judge');
      if (!isAdmin && !isSuperAdmin && !isJudge) return res.status(403).json({ error: "Rating access required" });

      const groupIdeas = await storage.getGroupIdeas(group.id);
      if (!groupIdeas.some(i => i.id === req.params.ideaId)) {
        return res.status(400).json({ error: "This idea does not belong to this group" });
      }

      const { score, feedback } = req.body;
      if (typeof score !== 'number' || score < 1 || score > 10) {
        return res.status(400).json({ error: "Score must be between 1 and 10" });
      }

      const rating = await storage.upsertGroupIdeaRating({
        groupId: group.id,
        ideaId: req.params.ideaId,
        ratedBy: req.session.userId,
        score,
        feedback,
      });
      res.json(rating);
    } catch (error) {
      console.error("Rate idea error:", error);
      res.status(500).json({ error: "Failed to rate idea" });
    }
  });

  app.post("/api/groups/:slug/add-member", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isSuperAdmin) return res.status(403).json({ error: "Super admin access required" });

      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const { userId, role } = req.body;
      if (!userId || !role) return res.status(400).json({ error: "userId and role are required" });
      if (!['admin', 'member', 'judge'].includes(role)) return res.status(400).json({ error: "Invalid role" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const member = await storage.addGroupMember(group.id, userId, role);
      res.json(member);
    } catch (error: any) {
      if (error.message?.includes('already a member')) {
        return res.status(400).json({ error: "User is already a member of this group" });
      }
      console.error("Add member error:", error);
      res.status(500).json({ error: "Failed to add member" });
    }
  });

  app.post("/api/groups/:slug/logo", avatarUpload.single("logo"), async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin && !isSuperAdmin) return res.status(403).json({ error: "Admin access required" });

      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const imageBuffer = fs.readFileSync(req.file.path);
      const resized = await sharp(imageBuffer)
        .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
        .png({ quality: 85 })
        .toBuffer();
      fs.unlinkSync(req.file.path);

      const logoUrl = `data:image/png;base64,${resized.toString('base64')}`;
      await storage.updateGroup(group.id, { logoUrl });

      res.json({ logoUrl });
    } catch (error) {
      console.error("Group logo upload error:", error);
      res.status(500).json({ error: "Failed to upload logo" });
    }
  });

  app.delete("/api/groups/:slug/logo", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin && !isSuperAdmin) return res.status(403).json({ error: "Admin access required" });

      await storage.updateGroup(group.id, { logoUrl: null });
      res.json({ success: true });
    } catch (error) {
      console.error("Group logo delete error:", error);
      res.status(500).json({ error: "Failed to delete logo" });
    }
  });

  app.get("/api/groups/:slug/search-users", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const isAdmin = await storage.isSuperadmin(req.session.userId);
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isGroupAdminUser = await storage.isGroupAdmin(group.id, req.session.userId);
      if (!isAdmin && !isGroupAdminUser) return res.status(403).json({ error: "Admin access required" });

      const query = (req.query.q as string || '').toLowerCase();
      if (query.length < 2) return res.json([]);

      const allUsers = await db
        .select({
          id: schema.users.id,
          fullName: schema.users.fullName,
          email: schema.users.email,
        })
        .from(schema.users)
        .where(
          or(
            ilike(schema.users.fullName, `%${query}%`),
            ilike(schema.users.email, `%${query}%`),
          )
        )
        .limit(20);

      const members = await storage.getGroupMembers(group.id);
      const memberIds = new Set(members.map(m => m.userId));
      const nonMembers = allUsers.filter(u => !memberIds.has(u.id));

      res.json(nonMembers);
    } catch (error) {
      console.error("Search users error:", error);
      res.status(500).json({ error: "Failed to search users" });
    }
  });

  // Public: Get group info + application questions (no auth required)
  app.get("/api/groups/:slug/public-info", async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      res.json({
        name: group.name,
        slug: group.slug,
        description: group.description,
        logoUrl: group.logoUrl,
        primaryColor: group.primaryColor,
        accentColor: group.accentColor,
        applicationQuestions: group.applicationQuestions || [],
        redirectUrl: group.redirectUrl || null,
        submissionMessage: group.submissionMessage || null,
        submissionFileUrl: group.submissionFileUrl || null,
      });
    } catch (error) {
      console.error("Get public group info error:", error);
      res.status(500).json({ error: "Failed to get group info" });
    }
  });

  // Public: Apply to a group (no auth required - creates account if needed)
  app.post("/api/groups/:slug/public-apply", async (req: Request, res: Response) => {
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const { firstName, lastName, email, universityName, graduationYear, major, answers, projectTitle, teamEmails: rawTeamEmails } = req.body;
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: "First name, last name, and email are required" });
      }

      if (typeof firstName !== 'string' || typeof lastName !== 'string' || typeof email !== 'string') {
        return res.status(400).json({ error: "Invalid field types" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      const configuredQuestions = (group as any).applicationQuestions as { label: string; type: string; required: boolean }[] | null;
      if (configuredQuestions && configuredQuestions.length > 0) {
        if (!Array.isArray(answers) || answers.length !== configuredQuestions.length) {
          return res.status(400).json({ error: "All application questions must be answered" });
        }
        for (let i = 0; i < configuredQuestions.length; i++) {
          const q = configuredQuestions[i];
          const a = answers[i];
          if (!a || typeof a.answer !== 'string') {
            return res.status(400).json({ error: `Invalid answer format for question ${i + 1}` });
          }
          if (q.required && !a.answer.trim()) {
            return res.status(400).json({ error: `"${q.label}" is required` });
          }
          if (q.type === 'file' && a.answer.trim()) {
            const filePattern = /^\[file:[^\]]+\]\/objects\/.+$/;
            if (!filePattern.test(a.answer)) {
              return res.status(400).json({ error: `Invalid file upload for "${q.label}"` });
            }
          }
        }
      }

      if (Array.isArray(rawTeamEmails)) {
        const emailRegex2 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (rawTeamEmails.length > 10) {
          return res.status(400).json({ error: "You can invite up to 10 team members" });
        }
        for (const te of rawTeamEmails) {
          if (typeof te !== 'string' || !emailRegex2.test(te.trim())) {
            return res.status(400).json({ error: "Invalid team member email address" });
          }
        }
      }

      const trimmedEmail = email.trim().toLowerCase();
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      let user = await storage.getUserByEmail(trimmedEmail);
      let isNewUser = false;

      if (!user) {
        const crypto = await import('crypto');
        const temporaryPassword = crypto.randomBytes(6).toString('base64url');
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        user = await storage.createUser({ email: trimmedEmail, password: hashedPassword, fullName });

        await storage.createProfile(user.id, {
          email: trimmedEmail,
          fullName,
          verificationStatus: "pending",
          onboardingCompleted: false,
          skills: [],
          interests: []
        });
        await storage.addUserRole(user.id, "student");

        const { sendAccountCreatedEmail } = await import('./email');
        sendAccountCreatedEmail(trimmedEmail, fullName, temporaryPassword, group.slug)
          .then(() => console.log(`[GroupApply] Account created email sent to: ${trimmedEmail}`))
          .catch(err => console.error(`[GroupApply] Failed to send account email to ${trimmedEmail}:`, err));

        isNewUser = true;
      }

      const existingApp = await storage.getUserApplicationForGroup(user.id, group.id);
      if (existingApp && (existingApp.status === 'pending' || existingApp.status === 'approved')) {
        return res.status(400).json({ error: "You already have an application for this group" });
      }

      const normalizedPublicTeamEmails = Array.isArray(rawTeamEmails) ? rawTeamEmails.map((e: string) => e.trim().toLowerCase()).filter(Boolean) : undefined;
      if (existingApp && existingApp.status === 'draft') {
        const motivation = answers?.map((a: { question: string; answer: string }) => `${a.question}: ${a.answer}`).join('\n\n') || '';
        await storage.updateGroupApplicationAnswers(existingApp.id, answers || [], motivation, projectTitle || undefined, normalizedPublicTeamEmails, {
          universityName: typeof universityName === 'string' ? universityName.trim() || undefined : undefined,
          graduationYear: typeof graduationYear === 'string' ? graduationYear.trim() || undefined : undefined,
          major: typeof major === 'string' ? major.trim() || undefined : undefined,
        });
        const { db: appDb } = await import('./db');
        const { sql: appSql } = await import('drizzle-orm');
        await appDb.execute(appSql`UPDATE group_applications SET status = 'pending', reviewed_by = NULL, reviewed_at = NULL WHERE id = ${existingApp.id}`);
      } else {
        await storage.createGroupApplication({
          groupId: group.id,
          userId: user.id,
          motivation: answers?.map((a: { question: string; answer: string }) => `${a.question}: ${a.answer}`).join('\n\n') || '',
          answers: answers || [],
          projectTitle: projectTitle || null,
          universityName: typeof universityName === 'string' ? universityName.trim() || null : null,
          graduationYear: typeof graduationYear === 'string' ? graduationYear.trim() || null : null,
          major: typeof major === 'string' ? major.trim() || null : null,
          teamEmails: normalizedPublicTeamEmails || null,
          status: 'pending',
        });
      }

      // Send email notifications (non-blocking)
      try {
        const { sendApplicationConfirmationEmail, sendAdminApplicationNotificationEmail, sendSuperAdminApplicationNotificationEmail } = await import('./email');

        // 1. Applicant confirmation email
        sendApplicationConfirmationEmail(trimmedEmail, fullName, group.name)
          .then(() => console.log(`[GroupApply] Confirmation email sent to: ${trimmedEmail}`))
          .catch(err => console.error(`[GroupApply] Failed to send confirmation email to ${trimmedEmail}:`, err));

        // 2. Group admin/owner notification emails
        const members = await storage.getGroupMembers(group.id);
        const adminsAndOwners = members.filter(m => m.role === 'admin' || m.role === 'owner');
        for (const admin of adminsAndOwners) {
          const adminUser = await storage.getUser(admin.userId);
          if (adminUser?.email) {
            sendAdminApplicationNotificationEmail(adminUser.email, adminUser.fullName || adminUser.email, fullName, trimmedEmail, group.name, group.slug)
              .then(() => console.log(`[GroupApply] Admin notification sent to: ${adminUser.email}`))
              .catch(err => console.error(`[GroupApply] Failed to send admin notification to ${adminUser.email}:`, err));
          }
        }

        // 3. Super admin notification emails
        const { db: notifDb } = await import('./db');
        const { sql: notifSql } = await import('drizzle-orm');
        const superAdmins = await notifDb.execute(notifSql`SELECT id, email, full_name FROM users WHERE is_superadmin = true`);
        const superAdminRows = (superAdmins as any).rows || superAdmins;
        for (const sa of superAdminRows) {
          if (sa.email) {
            sendSuperAdminApplicationNotificationEmail(sa.email, fullName, trimmedEmail, group.name)
              .then(() => console.log(`[GroupApply] Super admin notification sent to: ${sa.email}`))
              .catch(err => console.error(`[GroupApply] Failed to send super admin notification to ${sa.email}:`, err));
          }
        }
      } catch (emailErr) {
        console.error("[GroupApply] Error sending notification emails:", emailErr);
      }

      // In-app notifications
      try {
        await storage.createNotification({
          userId: user.id,
          type: 'group_application',
          title: 'Application Received',
          message: `Your application to ${group.name} has been received and is under review.`,
          link: `/portal/applications/${group.slug}`,
        });

        const members2 = await storage.getGroupMembers(group.id);
        const adminsAndOwners2 = members2.filter(m => m.role === 'admin' || m.role === 'owner');
        for (const admin of adminsAndOwners2) {
          await storage.createNotification({
            userId: admin.userId,
            type: 'group_application',
            title: 'New Application Submitted',
            message: `${fullName} submitted an application to ${group.name}.`,
            link: '/portal/group-admin',
          });
        }
      } catch (notifErr) {
        console.error("[GroupApply] Failed to create notifications:", notifErr);
      }

      res.json({
        success: true,
        isNewUser,
        message: 'Your application has been submitted successfully!',
      });
    } catch (error) {
      console.error("Public group apply error:", error);
      res.status(500).json({ error: "Failed to submit application" });
    }
  });

  // Update group application questions (admin only)
  app.patch("/api/groups/:slug/application-questions", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const group = await storage.getGroupBySlug(req.params.slug);
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isAdmin = await storage.isGroupAdmin(group.id, req.session.userId);
      const isSuperAdmin = await storage.isSuperadmin(req.session.userId);
      if (!isAdmin && !isSuperAdmin) return res.status(403).json({ error: "Admin access required" });

      const { applicationQuestions } = req.body;
      await storage.updateGroup(group.id, { applicationQuestions });
      res.json({ success: true });
    } catch (error) {
      console.error("Update application questions error:", error);
      res.status(500).json({ error: "Failed to update questions" });
    }
  });
}
