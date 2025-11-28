import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { CustomDomainModel } from '../models/CustomDomain';
import { AssessmentModel } from '../models/Assessment';
import { DomainVerificationService } from '../services/domainVerificationService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { APIError } from '../middleware/errorHandler';

const router = Router();

// Get all custom domains for current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!req.user) throw new APIError('Unauthorized', 401);

    const domains = await CustomDomainModel.findByUserId(req.user.userId);

    res.json({ domains });
  } catch (error) {
    next(error);
  }
});

// Get single custom domain
router.get(
  '/:id',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const domain = await CustomDomainModel.findById(req.params.id);

      if (!domain) {
        throw new APIError('Domain not found', 404);
      }

      if (domain.user_id !== req.user.userId) {
        throw new APIError('Access denied', 403);
      }

      // Get verification records
      const verificationRecords = await CustomDomainModel.getVerificationRecords(req.params.id);

      // Get DNS instructions
      const instructions = await DomainVerificationService.getDNSInstructions(req.params.id);

      res.json({
        domain,
        verification_records: verificationRecords,
        dns_instructions: instructions
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create new custom domain
router.post(
  '/',
  authenticateToken,
  validate([
    body('domain').trim().notEmpty(),
    body('subdomain').optional().trim(),
    body('assessment_id').optional().isUUID()
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const { domain: inputDomain, subdomain, assessment_id } = req.body;

      // Parse and validate domain
      let parsedDomain = inputDomain.toLowerCase().trim();
      let parsedSubdomain = subdomain?.toLowerCase().trim();

      // If no subdomain provided but domain has subdomain, parse it
      if (!parsedSubdomain) {
        const parsed = DomainVerificationService.parseDomain(parsedDomain);
        parsedDomain = parsed.domain;
        parsedSubdomain = parsed.subdomain;
      }

      // Validate domain format
      const fullDomain = parsedSubdomain
        ? `${parsedSubdomain}.${parsedDomain}`
        : parsedDomain;

      const validation = DomainVerificationService.validateDomain(fullDomain);
      if (!validation.valid) {
        throw new APIError(validation.message || 'Invalid domain', 400);
      }

      // Check if domain already exists
      const exists = await CustomDomainModel.isDomainTaken(fullDomain);
      if (exists) {
        throw new APIError('This domain is already registered', 400);
      }

      // If assessment_id provided, verify ownership
      if (assessment_id) {
        const assessment = await AssessmentModel.findById(assessment_id);
        if (!assessment) {
          throw new APIError('Assessment not found', 404);
        }
        if (assessment.user_id !== req.user.userId) {
          throw new APIError('You do not own this assessment', 403);
        }
      }

      // Create custom domain
      const customDomain = await CustomDomainModel.create({
        user_id: req.user.userId,
        assessment_id,
        domain: parsedDomain,
        subdomain: parsedSubdomain,
        verification_method: 'dns'
      });

      // Create verification records
      const txtRecord = await CustomDomainModel.createVerificationRecord({
        custom_domain_id: customDomain.id,
        record_type: 'TXT',
        record_name: `_verify.${customDomain.full_domain}`,
        record_value: customDomain.verification_token
      });

      const appDomain = process.env.APP_DOMAIN || 'app.surveyapp.com';
      const cnameRecord = await CustomDomainModel.createVerificationRecord({
        custom_domain_id: customDomain.id,
        record_type: 'CNAME',
        record_name: customDomain.full_domain,
        record_value: appDomain
      });

      // Get DNS instructions
      const instructions = await DomainVerificationService.getDNSInstructions(customDomain.id);

      res.status(201).json({
        message: 'Custom domain created successfully',
        domain: customDomain,
        verification_records: [txtRecord, cnameRecord],
        dns_instructions: instructions
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update custom domain (change assessment mapping)
router.patch(
  '/:id',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('assessment_id').optional().isUUID()
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await CustomDomainModel.findById(req.params.id);
      if (!existing) throw new APIError('Domain not found', 404);
      if (existing.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const { assessment_id } = req.body;

      // Verify assessment ownership if provided
      if (assessment_id) {
        const assessment = await AssessmentModel.findById(assessment_id);
        if (!assessment) {
          throw new APIError('Assessment not found', 404);
        }
        if (assessment.user_id !== req.user.userId) {
          throw new APIError('You do not own this assessment', 403);
        }
      }

      const domain = await CustomDomainModel.update(req.params.id, { assessment_id });

      res.json({
        message: 'Domain updated successfully',
        domain
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete custom domain
router.delete(
  '/:id',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await CustomDomainModel.findById(req.params.id);
      if (!existing) throw new APIError('Domain not found', 404);
      if (existing.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      await CustomDomainModel.delete(req.params.id);

      res.json({ message: 'Domain deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Verify domain
router.post(
  '/:id/verify',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await CustomDomainModel.findById(req.params.id);
      if (!existing) throw new APIError('Domain not found', 404);
      if (existing.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      // Run DNS verification
      const verificationResult = await DomainVerificationService.verifyDNS(req.params.id);

      if (verificationResult.verified) {
        // Also check CNAME configuration
        const appDomain = process.env.APP_DOMAIN || 'app.surveyapp.com';
        const cnameResult = await DomainVerificationService.verifyCNAME(
          req.params.id,
          appDomain
        );

        res.json({
          message: 'Verification check complete',
          verification: verificationResult,
          cname: cnameResult
        });
      } else {
        res.json({
          message: 'Verification failed',
          verification: verificationResult
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// Activate domain
router.post(
  '/:id/activate',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await CustomDomainModel.findById(req.params.id);
      if (!existing) throw new APIError('Domain not found', 404);
      if (existing.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      if (existing.verification_status !== 'verified') {
        throw new APIError('Domain must be verified before activation', 400);
      }

      if (!existing.dns_configured) {
        throw new APIError('DNS must be configured before activation', 400);
      }

      const domain = await CustomDomainModel.activate(req.params.id);

      res.json({
        message: 'Domain activated successfully',
        domain
      });
    } catch (error) {
      next(error);
    }
  }
);

// Deactivate domain
router.post(
  '/:id/deactivate',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await CustomDomainModel.findById(req.params.id);
      if (!existing) throw new APIError('Domain not found', 404);
      if (existing.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const domain = await CustomDomainModel.deactivate(req.params.id);

      res.json({
        message: 'Domain deactivated successfully',
        domain
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get domain analytics
router.get(
  '/:id/analytics',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('days').optional().isInt({ min: 1, max: 365 })
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await CustomDomainModel.findById(req.params.id);
      if (!existing) throw new APIError('Domain not found', 404);
      if (existing.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const days = parseInt(req.query.days as string) || 30;
      const stats = await CustomDomainModel.getAccessStats(req.params.id, days);

      res.json({
        domain: existing.full_domain,
        period_days: days,
        stats
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
