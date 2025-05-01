import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: import("@shared/schema").User;
    }
  }
}

// Extend session object to include user
declare module "express-session" {
  interface SessionData {
    user: import("@shared/schema").User;
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check if user exists in session
  if (!req.session?.user) {
    return res.status(401).json({ message: "غير مصرح بالوصول" });
  }

  // Get fresh user data from storage
  const user = await storage.getUser(req.session.user.id);
  if (!user) {
    return res.status(401).json({ message: "الحساب غير موجود" });
  }

  // Check if user is active
  if (!user.active) {
    return res.status(403).json({ message: "الحساب غير مفعل" });
  }

  // Add user to request
  req.user = user;
  next();
};

// Middleware to check user role
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "غير مصرح بالوصول" });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "غير مصرح لك بالوصول إلى هذه الصفحة" });
    }
    
    next();
  };
};
