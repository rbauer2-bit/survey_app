import { Router, Response } from 'express';
import { body } from 'express-validator';
import { AuthRequest, authenticateToken } from '../../middleware/auth';
import {
  requireAdmin,
  requireSuperAdmin,
  preventSuperAdminDeletion,
  auditLog,
} from '../../middleware/rbac';
import { UserModel, UserRole } from '../../models/User';
import { AuditLogModel } from '../../models/AuditLog';
import { hashPassword } from '../../utils/password';
import { validate } from '../../middleware/validation';
import { APIError } from '../../middleware/errorHandler';

const router = Router();

// All admin routes require authentication
router.use(authenticateToken);

/**
 * GET /api/admin/users
 * Get all users (admins only)
 */
router.get(
  '/',
  requireAdmin,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const users = await UserModel.findAll(limit, offset);

      // Remove password hashes from response
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        company_name: user.company_name,
        role: user.role,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        created_by: user.created_by,
        created_at: user.created_at,
      }));

      res.json({
        users: sanitizedUsers,
        pagination: {
          page,
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/users/stats
 * Get user statistics by role
 */
router.get(
  '/stats',
  requireAdmin,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const counts = await UserModel.countByRole();

      res.json({ counts });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/users/:id
 * Get specific user details
 */
router.get(
  '/:id',
  requireAdmin,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;

      const user = await UserModel.findById(id);

      if (!user) {
        throw new APIError('User not found', 404);
      }

      // Remove password hash
      const { password_hash, ...userData } = user;

      res.json({ user: userData });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/admin/users
 * Create a new user (admins only)
 */
router.post(
  '/',
  requireAdmin,
  auditLog('create_user', 'user'),
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('company_name').optional().trim(),
    body('role').isIn(['super_admin', 'assistant_admin', 'client', 'respondent']),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { email, password, name, company_name, role } = req.body;
      const currentUser = req.user!;

      // Only super admins can create other super admins
      if (role === 'super_admin' && currentUser.role !== 'super_admin') {
        throw new APIError('Only super admins can create other super admins', 403);
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        throw new APIError('User with this email already exists', 400);
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await UserModel.create(
        email,
        passwordHash,
        name,
        company_name,
        role as UserRole,
        currentUser.userId
      );

      // Remove password hash from response
      const { password_hash, ...userData } = user;

      res.status(201).json({
        message: 'User created successfully',
        user: userData,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/admin/users/:id/role
 * Update user role (admins only)
 */
router.patch(
  '/:id/role',
  requireAdmin,
  auditLog('update_user_role', 'user'),
  validate([body('role').isIn(['super_admin', 'assistant_admin', 'client', 'respondent'])]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const currentUser = req.user!;

      // Get target user
      const targetUser = await UserModel.findById(id);
      if (!targetUser) {
        throw new APIError('User not found', 404);
      }

      // Only super admins can modify super admin roles
      if (
        (targetUser.role === 'super_admin' || role === 'super_admin') &&
        currentUser.role !== 'super_admin'
      ) {
        throw new APIError('Only super admins can modify super admin roles', 403);
      }

      // Store old values for audit
      req.body._oldValues = { role: targetUser.role };

      const updatedUser = await UserModel.updateRole(id, role as UserRole);

      if (!updatedUser) {
        throw new APIError('Failed to update user role', 500);
      }

      // Remove password hash
      const { password_hash, ...userData } = updatedUser;

      res.json({
        message: 'User role updated successfully',
        user: userData,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/admin/users/:id
 * Update user details (admins only)
 */
router.patch(
  '/:id',
  requireAdmin,
  auditLog('update_user', 'user'),
  validate([
    body('name').optional().trim().notEmpty(),
    body('company_name').optional().trim(),
    body('subscription_tier').optional().isIn(['free', 'basic', 'pro', 'enterprise']),
    body('subscription_status').optional().isIn(['active', 'inactive', 'trial', 'cancelled']),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;

      const targetUser = await UserModel.findById(id);
      if (!targetUser) {
        throw new APIError('User not found', 404);
      }

      // Store old values for audit
      req.body._oldValues = { ...targetUser };

      const updates = {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.company_name !== undefined && { company_name: req.body.company_name }),
        ...(req.body.subscription_tier && { subscription_tier: req.body.subscription_tier }),
        ...(req.body.subscription_status && { subscription_status: req.body.subscription_status }),
      };

      const updatedUser = await UserModel.update(id, updates);

      if (!updatedUser) {
        throw new APIError('Failed to update user', 500);
      }

      // Remove password hash
      const { password_hash, ...userData } = updatedUser;

      res.json({
        message: 'User updated successfully',
        user: userData,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/users/:id
 * Delete a user (super admin only)
 */
router.delete(
  '/:id',
  requireSuperAdmin,
  preventSuperAdminDeletion,
  auditLog('delete_user', 'user'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { id } = req.params;
      const currentUser = req.user!;

      // Cannot delete yourself
      if (id === currentUser.userId) {
        throw new APIError('You cannot delete your own account', 400);
      }

      const targetUser = await UserModel.findById(id);
      if (!targetUser) {
        throw new APIError('User not found', 404);
      }

      // Store old values for audit
      req.body._oldValues = { ...targetUser };

      const deleted = await UserModel.delete(id);

      if (!deleted) {
        throw new APIError('Failed to delete user', 500);
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/audit-logs
 * Get audit logs (admins only)
 */
router.get(
  '/audit-logs/all',
  requireAdmin,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const logs = await AuditLogModel.findAll(limit, offset);
      const totalCount = await AuditLogModel.count();

      res.json({
        logs,
        pagination: {
          limit,
          offset,
          total: totalCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/audit-logs/user/:userId
 * Get audit logs for a specific user
 */
router.get(
  '/audit-logs/user/:userId',
  requireAdmin,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const logs = await AuditLogModel.findByUserId(userId, limit);

      res.json({ logs });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
