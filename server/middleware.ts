import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        full_name?: string;
      };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  req.user = {
    id: req.session.userId,
    email: '',
  };
  
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { storage } = await import('./storage');
    const isAdmin = await storage.isSuperadmin(req.session.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    return res.status(500).json({ error: 'Failed to verify admin access' });
  }
}
