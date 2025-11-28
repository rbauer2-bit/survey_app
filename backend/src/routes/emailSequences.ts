import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { EmailModel } from '../models/Email';
import { AssessmentModel } from '../models/Assessment';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { APIError } from '../middleware/errorHandler';

const router = Router();

// Create email sequence
router.post(
  '/',
  authenticateToken,
  validate([
    body('assessment_id').isUUID(),
    body('name').trim().notEmpty(),
    body('trigger_type').isIn(['immediate', 'score_based', 'time_delayed']),
    body('score_range_id').optional().isUUID()
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const assessment = await AssessmentModel.findById(req.body.assessment_id);
      if (!assessment) throw new APIError('Assessment not found', 404);
      if (assessment.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const sequence = await EmailModel.createSequence(req.body);

      res.status(201).json({
        message: 'Email sequence created successfully',
        sequence
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get sequences for an assessment
router.get(
  '/assessment/:assessmentId',
  authenticateToken,
  validate([param('assessmentId').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const assessment = await AssessmentModel.findById(req.params.assessmentId);
      if (!assessment) throw new APIError('Assessment not found', 404);
      if (assessment.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const sequences = await EmailModel.findSequencesByAssessmentId(req.params.assessmentId);

      res.json({ sequences });
    } catch (error) {
      next(error);
    }
  }
);

// Update email sequence
router.patch(
  '/:id',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('active').optional().isBoolean()
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await EmailModel.findSequenceById(req.params.id);
      if (!existing) throw new APIError('Sequence not found', 404);

      const assessment = await AssessmentModel.findById(existing.assessment_id);
      if (!assessment || assessment.user_id !== req.user.userId) {
        throw new APIError('Access denied', 403);
      }

      const sequence = await EmailModel.updateSequence(req.params.id, req.body);

      res.json({
        message: 'Sequence updated successfully',
        sequence
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete email sequence
router.delete(
  '/:id',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await EmailModel.findSequenceById(req.params.id);
      if (!existing) throw new APIError('Sequence not found', 404);

      const assessment = await AssessmentModel.findById(existing.assessment_id);
      if (!assessment || assessment.user_id !== req.user.userId) {
        throw new APIError('Access denied', 403);
      }

      await EmailModel.deleteSequence(req.params.id);

      res.json({ message: 'Sequence deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Add email template to sequence
router.post(
  '/:id/templates',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('subject').trim().notEmpty(),
    body('body_html').notEmpty(),
    body('body_text').notEmpty(),
    body('delay_days').isInt({ min: 0 }),
    body('order_index').isInt({ min: 0 })
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const sequence = await EmailModel.findSequenceById(req.params.id);
      if (!sequence) throw new APIError('Sequence not found', 404);

      const assessment = await AssessmentModel.findById(sequence.assessment_id);
      if (!assessment || assessment.user_id !== req.user.userId) {
        throw new APIError('Access denied', 403);
      }

      const template = await EmailModel.createTemplate({
        sequence_id: req.params.id,
        ...req.body
      });

      res.status(201).json({
        message: 'Email template created successfully',
        template
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get templates for a sequence
router.get(
  '/:id/templates',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const sequence = await EmailModel.findSequenceById(req.params.id);
      if (!sequence) throw new APIError('Sequence not found', 404);

      const assessment = await AssessmentModel.findById(sequence.assessment_id);
      if (!assessment || assessment.user_id !== req.user.userId) {
        throw new APIError('Access denied', 403);
      }

      const templates = await EmailModel.findTemplatesBySequenceId(req.params.id);

      res.json({ templates });
    } catch (error) {
      next(error);
    }
  }
);

// Update email template
router.patch(
  '/templates/:id',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('subject').optional().trim().notEmpty(),
    body('body_html').optional().notEmpty(),
    body('body_text').optional().notEmpty(),
    body('delay_days').optional().isInt({ min: 0 }),
    body('active').optional().isBoolean()
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await EmailModel.findTemplateById(req.params.id);
      if (!existing) throw new APIError('Template not found', 404);

      const sequence = await EmailModel.findSequenceById(existing.sequence_id);
      if (!sequence) throw new APIError('Sequence not found', 404);

      const assessment = await AssessmentModel.findById(sequence.assessment_id);
      if (!assessment || assessment.user_id !== req.user.userId) {
        throw new APIError('Access denied', 403);
      }

      const template = await EmailModel.updateTemplate(req.params.id, req.body);

      res.json({
        message: 'Template updated successfully',
        template
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete email template
router.delete(
  '/templates/:id',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await EmailModel.findTemplateById(req.params.id);
      if (!existing) throw new APIError('Template not found', 404);

      const sequence = await EmailModel.findSequenceById(existing.sequence_id);
      if (!sequence) throw new APIError('Sequence not found', 404);

      const assessment = await AssessmentModel.findById(sequence.assessment_id);
      if (!assessment || assessment.user_id !== req.user.userId) {
        throw new APIError('Access denied', 403);
      }

      await EmailModel.deleteTemplate(req.params.id);

      res.json({ message: 'Template deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
