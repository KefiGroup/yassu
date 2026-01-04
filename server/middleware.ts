import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user
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

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Attach user info to request (you can expand this to fetch full user data)
  req.user = {
    id: req.session.userId,
    email: '', // Would be fetched from database in real implementation
  };
  
  next();
}

// Middleware to require admin role
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // TODO: Check if user is admin from database
  // For now, just pass through (implement proper admin check)
  next();
}
