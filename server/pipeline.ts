import { Request, Response } from "express";
import { storage } from "./storage";

// Get pipeline statistics
export async function getPipelineStats(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if user is admin
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const roles = await storage.getUserRoles(userId);
    if (!roles.includes("admin")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Get all ideas
    const allIdeas = await storage.getAllIdeas();
    
    // Calculate statistics
    const totalIdeas = allIdeas.length;
    const activeIdeas = allIdeas.filter(idea => idea.status === 'active').length;
    
    // Get teams count (ideas with team members)
    let teamsFormed = 0;
    for (const idea of allIdeas) {
      const teamMembers = await storage.getIdeaTeamMembers(idea.id);
      if (teamMembers.length > 1) {
        teamsFormed++;
      }
    }
    
    // Projects launched (ideas with status 'launched' or completed workflows)
    const projectsLaunched = allIdeas.filter(idea => 
      idea.status === 'launched' || idea.status === 'completed'
    ).length;
    
    // Conversion rate (ideas that became projects)
    const conversionRate = totalIdeas > 0 
      ? Math.round((projectsLaunched / totalIdeas) * 100) 
      : 0;

    res.json({
      totalIdeas,
      activeIdeas,
      teamsFormed,
      projectsLaunched,
      conversionRate,
    });
  } catch (error) {
    console.error("Error fetching pipeline stats:", error);
    res.status(500).json({ message: "Failed to fetch pipeline statistics" });
  }
}

// Get ideas with pipeline stages
export async function getPipelineIdeas(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if user is admin
    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const roles = await storage.getUserRoles(userId);
    if (!roles.includes("admin")) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Get all ideas
    const allIdeas = await storage.getAllIdeas();
    
    // Map ideas to pipeline format with stages
    const pipelineIdeas = await Promise.all(
      allIdeas.map(async (idea) => {
        const creator = await storage.getUserById(idea.creatorId);
        const teamMembers = await storage.getIdeaTeamMembers(idea.id);
        
        // Determine pipeline stage based on idea status and team size
        let stage: 'submitted' | 'review' | 'active' | 'team_building' | 'launched' | 'archived' = 'submitted';
        
        if (idea.status === 'archived' || idea.status === 'rejected') {
          stage = 'archived';
        } else if (idea.status === 'launched' || idea.status === 'completed') {
          stage = 'launched';
        } else if (teamMembers.length > 1) {
          stage = 'team_building';
        } else if (idea.status === 'active') {
          stage = 'active';
        } else if (idea.status === 'pending') {
          stage = 'review';
        }

        return {
          id: idea.id,
          title: idea.title,
          creator: creator?.fullName || 'Unknown',
          stage,
          createdAt: idea.createdAt,
          teamSize: teamMembers.length,
        };
      })
    );

    // Sort by creation date (newest first)
    pipelineIdeas.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(pipelineIdeas);
  } catch (error) {
    console.error("Error fetching pipeline ideas:", error);
    res.status(500).json({ message: "Failed to fetch pipeline ideas" });
  }
}
