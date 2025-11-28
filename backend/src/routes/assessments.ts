import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { AssessmentModel } from '../models/Assessment';
import { QuestionModel } from '../models/Question';
import { ScoreRangeModel } from '../models/ScoreRange';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { APIError } from '../middleware/errorHandler';
import { slugify, generateUniqueSlug } from '../utils/slugify';

const router = Router();

// Create new assessment
router.post(
  '/',
  authenticateToken,
  validate([
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('industry').optional().trim(),
    body('target_avatar').optional().trim()
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const { title, description, industry, target_avatar, branding_config } = req.body;

      // Generate unique slug
      const baseSlug = slugify(title);
      const slug = await generateUniqueSlug(
        baseSlug,
        async (s) => (await AssessmentModel.findBySlug(s)) !== null
      );

      const assessment = await AssessmentModel.create({
        user_id: req.user.userId,
        title,
        description,
        industry,
        target_avatar,
        slug,
        branding_config
      });

      res.status(201).json({
        message: 'Assessment created successfully',
        assessment
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all assessments for current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!req.user) throw new APIError('Unauthorized', 401);

    const assessments = await AssessmentModel.findByUserId(req.user.userId);

    res.json({ assessments });
  } catch (error) {
    next(error);
  }
});

// Get single assessment with details
router.get(
  '/:id',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const assessment = await AssessmentModel.findWithDetails(req.params.id);

      if (!assessment) {
        throw new APIError('Assessment not found', 404);
      }

      if (assessment.user_id !== req.user.userId) {
        throw new APIError('Access denied', 403);
      }

      res.json({ assessment });
    } catch (error) {
      next(error);
    }
  }
);

// Update assessment
router.patch(
  '/:id',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('industry').optional().trim(),
    body('target_avatar').optional().trim(),
    body('status').optional().isIn(['draft', 'published', 'archived'])
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await AssessmentModel.findById(req.params.id);
      if (!existing) throw new APIError('Assessment not found', 404);
      if (existing.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const assessment = await AssessmentModel.update(req.params.id, req.body);

      res.json({
        message: 'Assessment updated successfully',
        assessment
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete assessment
router.delete(
  '/:id',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await AssessmentModel.findById(req.params.id);
      if (!existing) throw new APIError('Assessment not found', 404);
      if (existing.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      await AssessmentModel.delete(req.params.id);

      res.json({ message: 'Assessment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Publish assessment
router.post(
  '/:id/publish',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await AssessmentModel.findById(req.params.id);
      if (!existing) throw new APIError('Assessment not found', 404);
      if (existing.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const assessment = await AssessmentModel.publish(req.params.id);

      res.json({
        message: 'Assessment published successfully',
        assessment
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add question to assessment
router.post(
  '/:id/questions',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('question_text').trim().notEmpty(),
    body('question_type').isIn(['multiple_choice', 'single_choice']),
    body('order_index').isInt({ min: 0 }),
    body('answer_options').isArray({ min: 2 }),
    body('answer_options.*.option_text').trim().notEmpty(),
    body('answer_options.*.point_value').isInt({ min: 0 })
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const assessment = await AssessmentModel.findById(req.params.id);
      if (!assessment) throw new APIError('Assessment not found', 404);
      if (assessment.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const { question_text, question_type, order_index, required, answer_options } = req.body;

      const question = await QuestionModel.create({
        assessment_id: req.params.id,
        question_text,
        question_type,
        order_index,
        required
      });

      // Create answer options
      const createdOptions = [];
      for (let i = 0; i < answer_options.length; i++) {
        const option = await QuestionModel.createAnswerOption({
          question_id: question.id,
          option_text: answer_options[i].option_text,
          point_value: answer_options[i].point_value,
          order_index: i
        });
        createdOptions.push(option);
      }

      res.status(201).json({
        message: 'Question added successfully',
        question: {
          ...question,
          answer_options: createdOptions
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add score range to assessment
router.post(
  '/:id/score-ranges',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('range_name').trim().notEmpty(),
    body('min_score').isInt({ min: 0 }),
    body('max_score').isInt({ min: 0 }),
    body('description').optional().trim(),
    body('recommendations').optional().trim()
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const assessment = await AssessmentModel.findById(req.params.id);
      if (!assessment) throw new APIError('Assessment not found', 404);
      if (assessment.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const scoreRange = await ScoreRangeModel.create({
        assessment_id: req.params.id,
        ...req.body
      });

      res.status(201).json({
        message: 'Score range added successfully',
        score_range: scoreRange
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get assessment stats
router.get(
  '/:id/stats',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const assessment = await AssessmentModel.findById(req.params.id);
      if (!assessment) throw new APIError('Assessment not found', 404);
      if (assessment.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const stats = await AssessmentModel.getStats(req.params.id);

      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
