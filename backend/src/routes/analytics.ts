import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { requireRole, requireOwnerOrAdmin } from '../middleware/rbac';
import { AnalyticsModel } from '../models/Analytics';
import { AIAnalyticsService } from '../services/aiAnalyticsService';
import { AssessmentModel } from '../models/Assessment';
import { APIError } from '../middleware/errorHandler';

const router = Router();

// All analytics routes require authentication
router.use(authenticateToken);

/**
 * GET /api/analytics/assessments/:assessmentId/overview
 * Get overall statistics for an assessment
 */
router.get(
  '/assessments/:assessmentId/overview',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { assessmentId } = req.params;
      const user = req.user!;

      // Check ownership unless admin
      const assessment = await AssessmentModel.findById(assessmentId);
      if (!assessment) {
        throw new APIError('Assessment not found', 404);
      }

      if (
        assessment.user_id !== user.userId &&
        user.role !== 'super_admin' &&
        user.role !== 'assistant_admin'
      ) {
        throw new APIError('Access denied', 403);
      }

      const statistics = await AnalyticsModel.getAssessmentStatistics(assessmentId);

      if (!statistics) {
        throw new APIError('No statistics available', 404);
      }

      res.json({ statistics });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/assessments/:assessmentId/questions
 * Get question-by-question analysis with answer distributions
 */
router.get(
  '/assessments/:assessmentId/questions',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { assessmentId } = req.params;
      const user = req.user!;

      // Check ownership
      const assessment = await AssessmentModel.findById(assessmentId);
      if (!assessment) {
        throw new APIError('Assessment not found', 404);
      }

      if (
        assessment.user_id !== user.userId &&
        user.role !== 'super_admin' &&
        user.role !== 'assistant_admin'
      ) {
        throw new APIError('Access denied', 403);
      }

      const questionStats = await AnalyticsModel.getQuestionStats(assessmentId);

      res.json({ questions: questionStats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/assessments/:assessmentId/score-distribution
 * Get score range distribution
 */
router.get(
  '/assessments/:assessmentId/score-distribution',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { assessmentId } = req.params;
      const user = req.user!;

      // Check ownership
      const assessment = await AssessmentModel.findById(assessmentId);
      if (!assessment) {
        throw new APIError('Assessment not found', 404);
      }

      if (
        assessment.user_id !== user.userId &&
        user.role !== 'super_admin' &&
        user.role !== 'assistant_admin'
      ) {
        throw new APIError('Access denied', 403);
      }

      const scoreDistribution = await AnalyticsModel.getScoreDistribution(assessmentId);

      res.json({ distribution: scoreDistribution });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/assessments/:assessmentId/trends
 * Get response trends over time
 */
router.get(
  '/assessments/:assessmentId/trends',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { assessmentId } = req.params;
      const user = req.user!;
      const interval = (req.query.interval as 'day' | 'week' | 'month') || 'day';
      const limit = parseInt(req.query.limit as string) || 30;

      // Check ownership
      const assessment = await AssessmentModel.findById(assessmentId);
      if (!assessment) {
        throw new APIError('Assessment not found', 404);
      }

      if (
        assessment.user_id !== user.userId &&
        user.role !== 'super_admin' &&
        user.role !== 'assistant_admin'
      ) {
        throw new APIError('Access denied', 403);
      }

      const trends = await AnalyticsModel.getResponseTrends(assessmentId, interval, limit);

      res.json({ trends });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/analytics/assessments/:assessmentId/generate-insights
 * Generate AI-powered insights for an assessment
 */
router.post(
  '/assessments/:assessmentId/generate-insights',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { assessmentId } = req.params;
      const user = req.user!;

      // Check ownership
      const assessment = await AssessmentModel.findById(assessmentId);
      if (!assessment) {
        throw new APIError('Assessment not found', 404);
      }

      if (
        assessment.user_id !== user.userId &&
        user.role !== 'super_admin' &&
        user.role !== 'assistant_admin'
      ) {
        throw new APIError('Access denied', 403);
      }

      // Get all necessary data
      const statistics = await AnalyticsModel.getAssessmentStatistics(assessmentId);
      if (!statistics) {
        throw new APIError('No statistics available', 404);
      }

      const questionStats = await AnalyticsModel.getQuestionStats(assessmentId);
      const scoreDistribution = await AnalyticsModel.getScoreDistribution(assessmentId);

      // Generate AI insights
      const insights = await AIAnalyticsService.generateInsights({
        assessmentTitle: assessment.title,
        assessmentDescription: assessment.description,
        industry: assessment.industry,
        targetAvatar: assessment.target_avatar,
        statistics,
        questionStats,
        scoreDistribution,
      });

      // Save snapshot with insights
      const snapshot = await AnalyticsModel.createSnapshot(
        assessmentId,
        user.userId,
        questionStats,
        statistics.total_responses,
        insights
      );

      res.json({
        insights,
        snapshot_id: snapshot.id,
        generated_at: snapshot.ai_generated_at,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/assessments/:assessmentId/insights
 * Get latest AI-generated insights
 */
router.get(
  '/assessments/:assessmentId/insights',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { assessmentId } = req.params;
      const user = req.user!;

      // Check ownership
      const assessment = await AssessmentModel.findById(assessmentId);
      if (!assessment) {
        throw new APIError('Assessment not found', 404);
      }

      if (
        assessment.user_id !== user.userId &&
        user.role !== 'super_admin' &&
        user.role !== 'assistant_admin'
      ) {
        throw new APIError('Access denied', 403);
      }

      const snapshot = await AnalyticsModel.getLatestSnapshot(assessmentId);

      if (!snapshot || !snapshot.ai_insights) {
        return res.json({
          insights: null,
          message: 'No insights generated yet. Generate insights first.',
        });
      }

      res.json({
        insights: snapshot.ai_insights,
        generated_at: snapshot.ai_generated_at,
        total_responses: snapshot.total_responses,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/analytics/assessments/:assessmentId/content-suggestions
 * Generate content suggestions for reports/webinars/videos
 */
router.post(
  '/assessments/:assessmentId/content-suggestions',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { assessmentId } = req.params;
      const user = req.user!;

      // Check ownership
      const assessment = await AssessmentModel.findById(assessmentId);
      if (!assessment) {
        throw new APIError('Assessment not found', 404);
      }

      if (
        assessment.user_id !== user.userId &&
        user.role !== 'super_admin' &&
        user.role !== 'assistant_admin'
      ) {
        throw new APIError('Access denied', 403);
      }

      // Get statistics
      const statistics = await AnalyticsModel.getAssessmentStatistics(assessmentId);
      if (!statistics) {
        throw new APIError('No statistics available', 404);
      }

      const questionStats = await AnalyticsModel.getQuestionStats(assessmentId);

      // Generate content suggestions
      const suggestions = await AIAnalyticsService.generateContentSuggestions({
        assessmentTitle: assessment.title,
        assessmentDescription: assessment.description,
        industry: assessment.industry,
        targetAvatar: assessment.target_avatar,
        statistics,
        questionStats,
      });

      res.json({ suggestions });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/analytics/assessments/:assessmentId/trend-analysis
 * Generate trend analysis from historical data
 */
router.post(
  '/assessments/:assessmentId/trend-analysis',
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { assessmentId } = req.params;
      const user = req.user!;

      // Check ownership
      const assessment = await AssessmentModel.findById(assessmentId);
      if (!assessment) {
        throw new APIError('Assessment not found', 404);
      }

      if (
        assessment.user_id !== user.userId &&
        user.role !== 'super_admin' &&
        user.role !== 'assistant_admin'
      ) {
        throw new APIError('Access denied', 403);
      }

      // Get trend data
      const trends = await AnalyticsModel.getResponseTrends(assessmentId, 'day', 30);

      if (trends.length < 3) {
        return res.json({
          analysis: 'Insufficient data for trend analysis. Collect more responses over time.',
        });
      }

      // Generate AI trend analysis
      const analysis = await AIAnalyticsService.generateTrendAnalysis(assessmentId, trends);

      res.json({ analysis, trends });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/dashboard
 * Get overview analytics for all assessments (for clients)
 */
router.get('/dashboard', async (req: AuthRequest, res: Response, next) => {
  try {
    const user = req.user!;

    // Get all user's assessments statistics
    const stats = await AnalyticsModel.getUserAssessmentStatistics(user.userId);

    // Calculate totals
    const totals = {
      total_assessments: stats.length,
      total_responses: stats.reduce((sum, s) => sum + s.total_responses, 0),
      total_completed: stats.reduce((sum, s) => sum + s.completed_responses, 0),
      avg_completion_rate:
        stats.length > 0
          ? Math.round(
              stats.reduce(
                (sum, s) =>
                  sum + (s.total_responses > 0 ? (s.completed_responses / s.total_responses) * 100 : 0),
                0
              ) / stats.length
            )
          : 0,
    };

    res.json({
      totals,
      assessments: stats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
