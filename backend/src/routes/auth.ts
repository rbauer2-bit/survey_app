import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { UserModel } from '../models/User';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { validate } from '../middleware/validation';
import { APIError } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Register new user
router.post(
  '/register',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty(),
    body('company_name').optional().trim()
  ]),
  async (req: Request, res: Response, next) => {
    try {
      const { email, password, name, company_name } = req.body;

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        throw new APIError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          400
        );
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        throw new APIError('User with this email already exists', 400);
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await UserModel.create(email, passwordHash, name, company_name);

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company_name: user.company_name,
          role: user.role,
          subscription_tier: user.subscription_tier,
          subscription_status: user.subscription_status
        },
        token
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post(
  '/login',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ]),
  async (req: Request, res: Response, next) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        throw new APIError('Invalid email or password', 401);
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        throw new APIError('Invalid email or password', 401);
      }

      // Check subscription status
      if (user.subscription_status === 'cancelled') {
        throw new APIError('Your subscription has been cancelled', 403);
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company_name: user.company_name,
          role: user.role,
          subscription_tier: user.subscription_tier,
          subscription_status: user.subscription_status
        },
        token
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!req.user) {
      throw new APIError('User not authenticated', 401);
    }

    const user = await UserModel.findById(req.user.userId);
    if (!user) {
      throw new APIError('User not found', 404);
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company_name: user.company_name,
        role: user.role,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        created_at: user.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.patch(
  '/me',
  authenticateToken,
  validate([
    body('name').optional().trim().notEmpty(),
    body('company_name').optional().trim()
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) {
        throw new APIError('User not authenticated', 401);
      }

      const updates = {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.company_name !== undefined && { company_name: req.body.company_name })
      };

      const user = await UserModel.update(req.user.userId, updates);
      if (!user) {
        throw new APIError('Failed to update user', 500);
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company_name: user.company_name
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
