import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { AssessmentModel } from '../models/Assessment';
import { ResponseModel } from '../models/Response';
import { validate } from '../middleware/validation';
import { APIError } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get public assessment by slug (no auth required)
router.get(
  '/public/:slug',
  validate([param('slug').trim().notEmpty()]),
  async (req: Request, res: Response, next) => {
    try {
      const assessment = await AssessmentModel.findBySlug(req.params.slug);

      if (!assessment) {
        throw new APIError('Assessment not found', 404);
      }

      if (assessment.status !== 'published') {
        throw new APIError('Assessment is not available', 403);
      }

      const fullAssessment = await AssessmentModel.findWithDetails(assessment.id);

      // Remove score ranges from public view (don't reveal scoring logic)
      const publicAssessment = {
        id: fullAssessment!.id,
        title: fullAssessment!.title,
        description: fullAssessment!.description,
        industry: fullAssessment!.industry,
        branding_config: fullAssessment!.branding_config,
        questions: fullAssessment!.questions.map(q => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          order_index: q.order_index,
          required: q.required,
          answer_options: q.answer_options.map(a => ({
            id: a.id,
            option_text: a.option_text,
            order_index: a.order_index
            // Intentionally hiding point_value
          }))
        }))
      };

      res.json({ assessment: publicAssessment });
    } catch (error) {
      next(error);
    }
  }
);

// Submit assessment response (no auth required)
router.post(
  '/public/:slug/submit',
  validate([
    param('slug').trim().notEmpty(),
    body('respondent.email').isEmail().normalizeEmail(),
    body('respondent.name').optional().trim(),
    body('respondent.phone').optional().trim(),
    body('respondent.company').optional().trim(),
    body('answers').isArray({ min: 1 }),
    body('answers.*.question_id').isUUID(),
    body('answers.*.answer_option_id').isUUID()
  ]),
  async (req: Request, res: Response, next) => {
    try {
      const assessment = await AssessmentModel.findBySlug(req.params.slug);

      if (!assessment) {
        throw new APIError('Assessment not found', 404);
      }

      if (assessment.status !== 'published') {
        throw new APIError('Assessment is not available', 403);
      }

      // Create or get respondent
      const respondent = await ResponseModel.createRespondent(req.body.respondent);

      // Create response with answers
      const response = await ResponseModel.createResponse({
        assessment_id: assessment.id,
        respondent_id: respondent.id,
        answers: req.body.answers
      });

      // Fetch complete response details
      const fullResponse = await ResponseModel.findWithDetails(response.id);

      res.status(201).json({
        message: 'Assessment submitted successfully',
        response: {
          id: fullResponse!.id,
          total_score: fullResponse!.total_score,
          score_range: fullResponse!.score_range,
          completed_at: fullResponse!.completed_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get response details (requires auth - for assessment owner)
router.get(
  '/:id',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const response = await ResponseModel.findWithDetails(req.params.id);

      if (!response) {
        throw new APIError('Response not found', 404);
      }

      // Verify ownership through assessment
      const assessment = await AssessmentModel.findById(response.assessment_id);
      if (!assessment || assessment.user_id !== req.user.userId) {
        throw new APIError('Access denied', 403);
      }

      res.json({ response });
    } catch (error) {
      next(error);
    }
  }
);

// Get all responses for an assessment
router.get(
  '/assessment/:assessmentId',
  authenticateToken,
  validate([
    param('assessmentId').isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const assessment = await AssessmentModel.findById(req.params.assessmentId);
      if (!assessment) throw new APIError('Assessment not found', 404);
      if (assessment.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const responses = await ResponseModel.findByAssessmentId(
        req.params.assessmentId,
        limit,
        offset
      );

      res.json({ responses, limit, offset });
    } catch (error) {
      next(error);
    }
  }
);

// Get score distribution for an assessment
router.get(
  '/assessment/:assessmentId/distribution',
  authenticateToken,
  validate([param('assessmentId').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const assessment = await AssessmentModel.findById(req.params.assessmentId);
      if (!assessment) throw new APIError('Assessment not found', 404);
      if (assessment.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const distribution = await ResponseModel.getScoreDistribution(req.params.assessmentId);

      res.json({ distribution });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
