import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";

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
      const profile = await storage.updateProfile(req.session.userId, req.body);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
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
        status: "pending",
      });

      res.json(run);
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

  app.post("/api/functions/import-linkedin", async (req: Request, res: Response) => {
    try {
      const { linkedinContent } = req.body;
      
      if (!linkedinContent || linkedinContent.trim().length < 50) {
        return res.status(400).json({ error: "Please provide more LinkedIn content (at least 50 characters)" });
      }

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const systemPrompt = `You are a professional bio writer for a startup/tech community platform. Your task is to generate a professional bio from LinkedIn profile data.

STRICT RULES:
- Only use information explicitly provided in the input
- NEVER hallucinate or invent companies, degrees, dates, or achievements
- If something is unclear, omit it rather than guess
- Tone: concise, confident, appropriate for founders and tech professionals
- Focus on skills, experience, and what the person is looking for (cofounders, projects, opportunities)

OUTPUT FORMAT (JSON):
{
  "shortBio": "Max 600 characters. Professional summary highlighting key expertise and current focus.",
  "longBio": "Max 1200 characters. More detailed professional narrative including background and goals.",
  "highlights": ["3-6 bullet points of key achievements or expertise areas"],
  "skills": ["Relevant skill tags extracted from the profile, max 10"]
}

Only output valid JSON, no markdown or explanations.`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate a professional bio from this LinkedIn content:\n\n${linkedinContent.slice(0, 4000)}` }
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        console.error("OpenAI API error:", response.status, errorData);
        
        if (response.status === 429) {
          return res.status(429).json({ 
            error: "OpenAI rate limit exceeded. Please wait a minute and try again, or check your OpenAI account has sufficient credits." 
          });
        }
        if (response.status === 401) {
          return res.status(401).json({ error: "Invalid OpenAI API key. Please check your API key configuration." });
        }
        return res.status(response.status).json({ error: errorData.error?.message || "Failed to generate bio" });
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content;
      
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsedBio = JSON.parse(cleanContent);

      res.json({
        shortBio: String(parsedBio.shortBio || "").slice(0, 600),
        longBio: String(parsedBio.longBio || "").slice(0, 1200),
        highlights: Array.isArray(parsedBio.highlights) ? parsedBio.highlights.slice(0, 6) : [],
        skills: Array.isArray(parsedBio.skills) ? parsedBio.skills.slice(0, 10) : [],
      });
    } catch (error) {
      console.error("LinkedIn import error:", error);
      res.status(500).json({ error: "Failed to process LinkedIn content" });
    }
  });
}
