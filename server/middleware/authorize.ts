import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate.js';

const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] ?? 0;
    const hasAccess = allowedRoles.some(
      (role) => userLevel >= (ROLE_HIERARCHY[role] ?? 0)
    );

    if (!hasAccess) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

// Shorthand helpers
export const requireViewer     = authorize('VIEWER');
export const requireManager    = authorize('MANAGER');
export const requireAdmin      = authorize('ADMIN');
export const requireSuperAdmin = authorize('SUPER_ADMIN');
