import { Request, Response, NextFunction } from 'express';
import { CustomDomainModel } from '../models/CustomDomain';

/**
 * Middleware to handle custom domain routing
 * This checks if the incoming request is from a custom domain
 * and routes it to the appropriate assessment
 */
export const customDomainRouter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hostname = req.hostname;

    // Skip if it's the main app domain
    const appDomain = process.env.APP_DOMAIN || 'localhost';
    const frontendDomain = new URL(process.env.FRONTEND_URL || 'http://localhost:3000').hostname;

    if (hostname === appDomain || hostname === frontendDomain || hostname === 'localhost') {
      return next();
    }

    // Check if this is a custom domain
    const customDomain = await CustomDomainModel.findByFullDomain(hostname);

    if (customDomain) {
      // Log access
      await CustomDomainModel.logAccess({
        custom_domain_id: customDomain.id,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        response_status: 200
      });

      // Check if domain is active and verified
      if (!customDomain.is_active) {
        res.status(503).json({
          error: 'Domain not active',
          message: 'This custom domain is not currently active. Please contact the domain owner.'
        });
        return;
      }

      if (customDomain.verification_status !== 'verified') {
        res.status(503).json({
          error: 'Domain not verified',
          message: 'This custom domain is not verified yet. Please try again later.'
        });
        return;
      }

      if (!customDomain.assessment_id) {
        res.status(404).json({
          error: 'No assessment configured',
          message: 'This custom domain is not linked to an assessment.'
        });
        return;
      }

      // Attach custom domain info to request for downstream use
      (req as any).customDomain = customDomain;
      (req as any).isCustomDomain = true;

      // Redirect to the assessment route
      // The actual response handling is done in the responses route
      req.url = `/api/responses/public/custom-domain/${customDomain.assessment_id}`;
    }

    next();
  } catch (error) {
    console.error('Custom domain routing error:', error);
    next(error);
  }
};

/**
 * Helper function to determine if request is from custom domain
 */
export const isCustomDomainRequest = (req: Request): boolean => {
  return !!(req as any).isCustomDomain;
};

/**
 * Get custom domain from request
 */
export const getCustomDomain = (req: Request): any => {
  return (req as any).customDomain;
};
