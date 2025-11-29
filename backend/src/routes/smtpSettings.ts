import { Router, Response } from 'express';
import { body } from 'express-validator';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { UserModel } from '../models/User';
import { emailService } from '../services/emailService';
import { validate } from '../middleware/validation';
import { APIError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/smtp-settings
 * Get current user's SMTP configuration
 */
router.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const user = req.user!;
    const smtpConfig = await UserModel.getSMTPConfig(user.userId);

    // Don't send the password back to client
    const sanitizedConfig = smtpConfig ? {
      ...smtpConfig,
      auth: {
        ...smtpConfig.auth,
        pass: smtpConfig.auth?.pass ? '••••••••' : null
      }
    } : null;

    res.json({ smtp_config: sanitizedConfig });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/smtp-settings
 * Update SMTP configuration for current user
 */
router.post(
  '/',
  validate([
    body('host').trim().notEmpty(),
    body('port').isInt({ min: 1, max: 65535 }),
    body('secure').isBoolean(),
    body('auth.user').trim().notEmpty(),
    body('auth.pass').trim().notEmpty(),
    body('from_email').isEmail().normalizeEmail(),
    body('from_name').trim().notEmpty()
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const user = req.user!;

      const smtpConfig = {
        host: req.body.host,
        port: parseInt(req.body.port),
        secure: req.body.secure === true,
        auth: {
          user: req.body.auth.user,
          pass: req.body.auth.pass
        },
        from_email: req.body.from_email,
        from_name: req.body.from_name
      };

      // Update user's SMTP config
      await UserModel.updateSMTPConfig(user.userId, smtpConfig);

      res.json({
        message: 'SMTP configuration updated successfully',
        smtp_config: {
          ...smtpConfig,
          auth: {
            ...smtpConfig.auth,
            pass: '••••••••' // Don't send password back
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/smtp-settings/test
 * Test SMTP configuration
 */
router.post(
  '/test',
  validate([
    body('host').trim().notEmpty(),
    body('port').isInt({ min: 1, max: 65535 }),
    body('secure').isBoolean(),
    body('auth.user').trim().notEmpty(),
    body('auth.pass').trim().notEmpty(),
    body('from_email').isEmail().normalizeEmail(),
    body('from_name').trim().notEmpty(),
    body('test_email').isEmail().normalizeEmail()
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const smtpConfig = {
        host: req.body.host,
        port: parseInt(req.body.port),
        secure: req.body.secure === true,
        auth: {
          user: req.body.auth.user,
          pass: req.body.auth.pass
        },
        from_email: req.body.from_email,
        from_name: req.body.from_name
      };

      const testEmail = req.body.test_email;

      // Test SMTP configuration
      const success = await emailService.testSMTPConfig(smtpConfig, testEmail);

      if (success) {
        res.json({
          success: true,
          message: `Test email sent successfully to ${testEmail}`
        });
      } else {
        throw new APIError('SMTP test failed', 400);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/smtp-settings
 * Remove SMTP configuration (revert to default)
 */
router.delete('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const user = req.user!;

    // Set SMTP config to null to use default
    await UserModel.updateSMTPConfig(user.userId, null);

    res.json({
      message: 'SMTP configuration removed. Using default SMTP settings.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
