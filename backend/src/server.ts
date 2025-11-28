import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import authRoutes from './routes/auth';
import assessmentRoutes from './routes/assessments';
import responseRoutes from './routes/responses';
import emailSequenceRoutes from './routes/emailSequences';
import customDomainRoutes from './routes/customDomains';
import ghlIntegrationRoutes from './routes/ghlIntegrations';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { customDomainRouter } from './middleware/customDomainRouter';

// Import workers
import { emailWorker } from './workers/emailWorker';
import { domainVerificationWorker } from './workers/domainVerificationWorker';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom domain routing middleware (must be before routes)
app.use(customDomainRouter);

// Serve static PDF files
app.use('/pdfs', express.static(path.join(__dirname, '../pdfs')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/email-sequences', emailSequenceRoutes);
app.use('/api/custom-domains', customDomainRoutes);
app.use('/api/ghl-integrations', ghlIntegrationRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const pool = (await import('./config/database')).default;
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Test email service
    const { emailService } = await import('./services/emailService');
    await emailService.testConnection();
    console.log('✅ Email service initialized');

    // Start email worker
    emailWorker.start();
    console.log('✅ Email worker started');

    // Start domain verification worker
    domainVerificationWorker.start();
    console.log('✅ Domain verification worker started');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
