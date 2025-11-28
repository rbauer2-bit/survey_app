import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { GHLIntegrationModel } from '../models/GHLIntegration';
import { GHLService } from '../services/ghlService';
import { AssessmentModel } from '../models/Assessment';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { APIError } from '../middleware/errorHandler';

const router = Router();

// Get all GHL integrations for current user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response, next) => {
  try {
    if (!req.user) throw new APIError('Unauthorized', 401);

    const integrations = await GHLIntegrationModel.findByUserId(req.user.userId);

    // Don't expose API keys in list view
    const safeIntegrations = integrations.map(int => ({
      ...int,
      api_key: '***' + int.api_key.slice(-4),
    }));

    res.json({ integrations: safeIntegrations });
  } catch (error) {
    next(error);
  }
});

// Get single GHL integration
router.get(
  '/:id',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const integration = await GHLIntegrationModel.findById(req.params.id);

      if (!integration) {
        throw new APIError('Integration not found', 404);
      }

      if (integration.user_id !== req.user.userId) {
        throw new APIError('Access denied', 403);
      }

      // Get field mappings
      const fieldMappings = await GHLIntegrationModel.getFieldMappings(req.params.id);

      // Get workflow triggers
      const workflowTriggers = await GHLIntegrationModel.getWorkflowTriggers(req.params.id);

      // Get tag rules
      const tagRules = await GHLIntegrationModel.getTagRules(req.params.id);

      res.json({
        integration: {
          ...integration,
          api_key: '***' + integration.api_key.slice(-4),
        },
        field_mappings: fieldMappings,
        workflow_triggers: workflowTriggers,
        tag_rules: tagRules,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create GHL integration
router.post(
  '/',
  authenticateToken,
  validate([
    body('location_id').trim().notEmpty(),
    body('api_key').trim().notEmpty(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const { location_id, api_key } = req.body;

      // Test the API key before saving
      const testService = new GHLService(api_key, location_id);
      const testResult = await testService.testConnection();

      if (!testResult.success) {
        throw new APIError(
          `Failed to connect to GHL: ${testResult.error}`,
          400
        );
      }

      // Create integration
      const integration = await GHLIntegrationModel.create({
        user_id: req.user.userId,
        location_id,
        api_key,
      });

      res.status(201).json({
        message: 'GHL integration created successfully',
        integration: {
          ...integration,
          api_key: '***' + integration.api_key.slice(-4),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update GHL integration
router.patch(
  '/:id',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('location_id').optional().trim(),
    body('api_key').optional().trim(),
    body('is_active').optional().isBoolean(),
    body('sync_enabled').optional().isBoolean(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await GHLIntegrationModel.findById(req.params.id);
      if (!existing) throw new APIError('Integration not found', 404);
      if (existing.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      // If updating API key, test connection
      if (req.body.api_key) {
        const testService = new GHLService(
          req.body.api_key,
          req.body.location_id || existing.location_id
        );
        const testResult = await testService.testConnection();

        if (!testResult.success) {
          throw new APIError(
            `Failed to connect to GHL: ${testResult.error}`,
            400
          );
        }
      }

      const integration = await GHLIntegrationModel.update(req.params.id, req.body);

      res.json({
        message: 'Integration updated successfully',
        integration: {
          ...integration,
          api_key: '***' + integration!.api_key.slice(-4),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete GHL integration
router.delete(
  '/:id',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const existing = await GHLIntegrationModel.findById(req.params.id);
      if (!existing) throw new APIError('Integration not found', 404);
      if (existing.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      await GHLIntegrationModel.delete(req.params.id);

      res.json({ message: 'Integration deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Test GHL connection
router.post(
  '/:id/test',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const integration = await GHLIntegrationModel.findById(req.params.id);
      if (!integration) throw new APIError('Integration not found', 404);
      if (integration.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const service = new GHLService(integration.api_key, integration.location_id);
      const result = await service.testConnection();

      if (result.success) {
        res.json({
          success: true,
          message: 'Successfully connected to GHL',
        });
      } else {
        throw new APIError(`Connection failed: ${result.error}`, 400);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Get GHL custom fields
router.get(
  '/:id/custom-fields',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const integration = await GHLIntegrationModel.findById(req.params.id);
      if (!integration) throw new APIError('Integration not found', 404);
      if (integration.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const service = new GHLService(integration.api_key, integration.location_id);
      const customFields = await service.getCustomFields();

      res.json({ custom_fields: customFields });
    } catch (error) {
      next(error);
    }
  }
);

// Add field mapping
router.post(
  '/:id/field-mappings',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('assessment_id').optional().isUUID(),
    body('source_field').trim().notEmpty(),
    body('ghl_field_key').trim().notEmpty(),
    body('ghl_field_type').optional().trim(),
    body('transform_function').optional().trim(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const integration = await GHLIntegrationModel.findById(req.params.id);
      if (!integration) throw new APIError('Integration not found', 404);
      if (integration.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      // If assessment_id provided, verify ownership
      if (req.body.assessment_id) {
        const assessment = await AssessmentModel.findById(req.body.assessment_id);
        if (!assessment || assessment.user_id !== req.user.userId) {
          throw new APIError('Invalid assessment', 403);
        }
      }

      const mapping = await GHLIntegrationModel.createFieldMapping({
        integration_id: req.params.id,
        ...req.body,
      });

      res.status(201).json({
        message: 'Field mapping created',
        mapping,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete field mapping
router.delete(
  '/:id/field-mappings/:mappingId',
  authenticateToken,
  validate([
    param('id').isUUID(),
    param('mappingId').isUUID(),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const integration = await GHLIntegrationModel.findById(req.params.id);
      if (!integration) throw new APIError('Integration not found', 404);
      if (integration.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      await GHLIntegrationModel.deleteFieldMapping(req.params.mappingId);

      res.json({ message: 'Field mapping deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// Add workflow trigger
router.post(
  '/:id/workflow-triggers',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('assessment_id').optional().isUUID(),
    body('score_range_id').optional().isUUID(),
    body('ghl_workflow_id').trim().notEmpty(),
    body('trigger_type').optional().isIn(['score_range', 'all_completions', 'score_threshold']),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const integration = await GHLIntegrationModel.findById(req.params.id);
      if (!integration) throw new APIError('Integration not found', 404);
      if (integration.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const trigger = await GHLIntegrationModel.createWorkflowTrigger({
        integration_id: req.params.id,
        ...req.body,
      });

      res.status(201).json({
        message: 'Workflow trigger created',
        trigger,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add tag rule
router.post(
  '/:id/tag-rules',
  authenticateToken,
  validate([
    param('id').isUUID(),
    body('assessment_id').optional().isUUID(),
    body('score_range_id').optional().isUUID(),
    body('tag_name').trim().notEmpty(),
    body('apply_on').optional().isIn(['completion', 'score_range']),
  ]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const integration = await GHLIntegrationModel.findById(req.params.id);
      if (!integration) throw new APIError('Integration not found', 404);
      if (integration.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      const tagRule = await GHLIntegrationModel.createTagRule({
        integration_id: req.params.id,
        ...req.body,
      });

      res.status(201).json({
        message: 'Tag rule created',
        tag_rule: tagRule,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get sync logs for integration
router.get(
  '/:id/sync-logs',
  authenticateToken,
  validate([param('id').isUUID()]),
  async (req: AuthRequest, res: Response, next) => {
    try {
      if (!req.user) throw new APIError('Unauthorized', 401);

      const integration = await GHLIntegrationModel.findById(req.params.id);
      if (!integration) throw new APIError('Integration not found', 404);
      if (integration.user_id !== req.user.userId) throw new APIError('Access denied', 403);

      // This would need a method to get logs by integration - simplified for now
      res.json({ logs: [] });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
