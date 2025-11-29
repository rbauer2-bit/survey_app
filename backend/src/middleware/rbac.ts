import { Request, Response, NextFunction } from 'express';
import { UserModel, UserRole } from '../models/User';
import { AuditLogModel } from '../models/AuditLog';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

/**
 * Middleware to check if user has a specific role
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          error: 'Access denied',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

/**
 * Middleware to check if user is any type of admin
 */
export const requireAdmin = requireRole('super_admin', 'assistant_admin');

/**
 * Middleware to check if user is super admin
 */
export const requireSuperAdmin = requireRole('super_admin');

/**
 * Middleware to check if user owns a resource or is an admin
 */
export const requireOwnerOrAdmin = (userIdField: string = 'user_id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Admins can access anything
      if (user.role === 'super_admin' || user.role === 'assistant_admin') {
        return next();
      }

      // Check if user owns the resource
      // The resource user_id might be in params, body, or query
      const resourceUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField];

      if (resourceUserId && resourceUserId === user.userId) {
        return next();
      }

      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only access your own resources',
      });
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

/**
 * Middleware to prevent deletion of super admins by assistant admins
 */
export const preventSuperAdminDeletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;
    const targetUserId = req.params.id || req.params.userId;

    if (!user || !targetUserId) {
      return next();
    }

    // Only check if current user is assistant_admin
    if (user.role === 'assistant_admin') {
      const targetUser = await UserModel.findById(targetUserId);

      if (targetUser && targetUser.role === 'super_admin') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Assistant admins cannot delete super admins',
        });
      }
    }

    next();
  } catch (error) {
    console.error('Super admin protection error:', error);
    res.status(500).json({ error: 'Authorization error' });
  }
};

/**
 * Middleware to log admin actions for audit trail
 */
export const auditLog = (action: string, entityType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to capture response
    res.json = function (body: any) {
      // Only log if action was successful (status 2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = req.user;

        if (user && (user.role === 'super_admin' || user.role === 'assistant_admin')) {
          const entityId = req.params.id || body?.id || null;
          const oldValues = req.body._oldValues || null; // Can be set by route handler
          const newValues = req.body;

          // Log asynchronously, don't wait
          AuditLogModel.create({
            user_id: user.userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_values: oldValues,
            new_values: newValues,
            ip_address: req.ip || req.socket.remoteAddress,
            user_agent: req.get('user-agent'),
          }).catch(err => {
            console.error('Failed to create audit log:', err);
          });
        }
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Middleware to check data ownership for non-admin users
 */
export const checkDataOwnership = (model: any, idField: string = 'id', ownerField: string = 'user_id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Admins bypass ownership check
      if (user.role === 'super_admin' || user.role === 'assistant_admin') {
        return next();
      }

      const resourceId = req.params[idField];

      if (!resourceId) {
        return res.status(400).json({ error: 'Resource ID required' });
      }

      // Fetch the resource
      const resource = await model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Check ownership
      if (resource[ownerField] !== user.userId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to access this resource',
        });
      }

      // Attach resource to request for use in route handler
      req.body._resource = resource;

      next();
    } catch (error) {
      console.error('Data ownership check error:', error);
      res.status(500).json({ error: 'Authorization error' });
    }
  };
};

/**
 * Helper to check if user can perform action
 */
export const canPerformAction = (userRole: UserRole, requiredRoles: UserRole[]): boolean => {
  return requiredRoles.includes(userRole);
};

/**
 * Helper to get permission level
 */
export const getPermissionLevel = (role: UserRole): number => {
  const levels: Record<UserRole, number> = {
    respondent: 1,
    client: 2,
    assistant_admin: 3,
    super_admin: 4,
  };

  return levels[role] || 0;
};

/**
 * Check if user has at least a certain permission level
 */
export const requirePermissionLevel = (minLevel: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userLevel = getPermissionLevel(user.role);

    if (userLevel < minLevel) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};
