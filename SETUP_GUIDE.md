# Complete Setup Guide

This guide will walk you through setting up the Survey App from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Production Deployment](#production-deployment)
4. [Configuration](#configuration)
5. [Testing](#testing)

## Prerequisites

### Required Software
- **Node.js**: Version 18.x or higher
  - Download from: https://nodejs.org/
  - Verify: `node --version`

- **npm**: Comes with Node.js
  - Verify: `npm --version`

- **PostgreSQL**: Version 14.x or higher
  - Download from: https://www.postgresql.org/download/
  - Verify: `psql --version`

### Required Services
- **Email Service** (choose one):
  - SendGrid (recommended): https://sendgrid.com
  - Mailgun: https://www.mailgun.com

- **Cloud Storage** (optional):
  - AWS S3 for PDF storage

## Local Development Setup

### Step 1: Clone and Install

```bash
# Navigate to project directory
cd survey_app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Database Setup

```bash
# Start PostgreSQL (if not running)
# On macOS:
brew services start postgresql

# On Linux:
sudo systemctl start postgresql

# Create database
createdb survey_app

# Or using psql:
psql postgres
CREATE DATABASE survey_app;
\q

# Run migrations
cd backend
psql -d survey_app -f src/database/migrations/001_initial_schema.sql
```

Verify migration:
```bash
psql survey_app
\dt  # Should list all tables
\q
```

### Step 3: Backend Configuration

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env file
nano .env  # or use your preferred editor
```

**Minimum required configuration**:
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=survey_app
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=generate_a_long_random_string_here

SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Survey App
```

**Generate a secure JWT secret**:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 4: Email Service Setup

#### Option A: SendGrid (Recommended)

1. Sign up at https://sendgrid.com
2. Navigate to Settings > API Keys
3. Click "Create API Key"
4. Give it a name and select "Full Access"
5. Copy the API key (you won't see it again!)
6. Add to `.env`:
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=Survey App
   ```

#### Option B: Mailgun

1. Sign up at https://www.mailgun.com
2. Add and verify your domain
3. Get your API key from Settings > API Security
4. Add to `.env`:
   ```env
   MAILGUN_API_KEY=your_api_key
   MAILGUN_DOMAIN=mg.yourdomain.com
   MAILGUN_FROM_EMAIL=noreply@yourdomain.com
   ```

### Step 5: Frontend Configuration

```bash
cd ../frontend

# Copy environment file
cp .env.example .env

# Edit .env file
nano .env
```

**Configuration**:
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Survey App
```

### Step 6: Start Development Servers

Open two terminal windows/tabs:

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

You should see:
```
✅ Database connected successfully
✅ Email service initialized
✅ Email worker started
🚀 Server running on port 5000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### Step 7: Test the Application

1. Open browser to `http://localhost:3000`
2. Click "Sign Up"
3. Create an account
4. You should be redirected to the dashboard

**Create a test assessment**:
1. Click "New Assessment"
2. Fill in title and description
3. Save and add questions
4. Add score ranges
5. Publish the assessment
6. Copy the public URL and test it in an incognito window

## Production Deployment

### Option 1: Heroku Deployment

#### Backend on Heroku

```bash
# Install Heroku CLI
brew install heroku/brew/heroku  # macOS
# or download from https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
cd backend
heroku create your-app-name-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set SENDGRID_API_KEY=your_sendgrid_key
heroku config:set SENDGRID_FROM_EMAIL=noreply@yourdomain.com
heroku config:set FRONTEND_URL=https://your-frontend-domain.com

# Deploy
git init
git add .
git commit -m "Initial commit"
git push heroku main

# Run migrations
heroku run bash
psql $DATABASE_URL -f src/database/migrations/001_initial_schema.sql
```

#### Frontend on Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Set environment variables in Vercel dashboard
# VITE_API_URL=https://your-app-name-api.herokuapp.com/api
```

### Option 2: DigitalOcean App Platform

#### Backend

1. Connect your GitHub repository
2. Select "backend" folder as source
3. Set environment variables
4. Choose database plan (PostgreSQL)
5. Deploy

#### Frontend

1. Create new app
2. Select "frontend" folder
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Deploy

### Option 3: AWS Deployment

#### Backend on EC2

1. Launch EC2 instance (Ubuntu 22.04)
2. Install Node.js and PostgreSQL
3. Clone repository
4. Set up PM2 for process management
5. Configure Nginx as reverse proxy
6. Set up SSL with Let's Encrypt

```bash
# Install dependencies
sudo apt update
sudo apt install nodejs npm postgresql nginx

# Install PM2
sudo npm install -g pm2

# Start application
cd backend
npm install
npm run build
pm2 start dist/server.js --name survey-api

# Save PM2 process list
pm2 save
pm2 startup
```

#### Frontend on S3 + CloudFront

1. Build frontend: `npm run build`
2. Create S3 bucket
3. Upload `dist/` contents
4. Enable static website hosting
5. Create CloudFront distribution
6. Configure custom domain

## Configuration Details

### Database Configuration

**Connection Pooling**:
The app uses pg pool with these settings:
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

**For production**, increase pool size based on traffic:
```typescript
const pool = new Pool({
  max: 50,  // Increase for high traffic
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

### Email Worker Configuration

The email worker runs every minute via cron job. For production with high volume:

1. **Separate Worker Process**:
   ```bash
   # Create separate worker service
   pm2 start dist/workers/emailWorker.js --name email-worker
   ```

2. **Use Redis Queue** (recommended for scale):
   - Install Bull or BullMQ
   - Queue emails instead of direct sending
   - Scale workers horizontally

### PDF Storage

**Local Development**: PDFs stored in `backend/pdfs/`

**Production Options**:

1. **AWS S3** (recommended):
   ```typescript
   // In pdfService.ts, upload to S3
   const s3 = new AWS.S3();
   await s3.upload({
     Bucket: process.env.AWS_S3_BUCKET,
     Key: fileName,
     Body: pdfBuffer,
   }).promise();
   ```

2. **CloudFlare R2**: Similar to S3 but cheaper

3. **Local with CDN**: Store locally, serve via CDN

## Testing

### Backend API Testing

```bash
cd backend

# Install testing dependencies (if not already)
npm install --save-dev jest supertest @types/jest

# Run tests
npm test
```

**Manual API testing with curl**:

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'

# Get assessments (replace TOKEN with JWT from login)
curl http://localhost:5000/api/assessments \
  -H "Authorization: Bearer TOKEN"
```

### Frontend Testing

```bash
cd frontend

# Start dev server
npm run dev

# In another terminal, test build
npm run build
npm run preview
```

### Database Testing

```sql
-- Connect to database
psql survey_app

-- Check tables
\dt

-- Sample queries
SELECT * FROM users;
SELECT * FROM assessments;
SELECT * FROM questions;

-- Test score calculation
SELECT
  r.id,
  r.total_score,
  sr.range_name,
  resp.email
FROM responses r
JOIN respondents resp ON resp.id = r.respondent_id
LEFT JOIN score_ranges sr ON sr.id = r.score_range_id
ORDER BY r.completed_at DESC
LIMIT 10;
```

## Monitoring and Maintenance

### Application Monitoring

1. **Logs**:
   ```bash
   # Backend logs
   pm2 logs survey-api

   # Email worker logs
   pm2 logs email-worker
   ```

2. **Database Monitoring**:
   ```sql
   -- Check database size
   SELECT pg_size_pretty(pg_database_size('survey_app'));

   -- Active connections
   SELECT count(*) FROM pg_stat_activity;

   -- Slow queries
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

3. **Email Delivery Monitoring**:
   ```sql
   -- Check failed emails
   SELECT COUNT(*) FROM email_deliveries WHERE status = 'failed';

   -- Check pending emails
   SELECT COUNT(*) FROM email_deliveries
   WHERE status = 'scheduled'
   AND scheduled_for <= NOW();
   ```

### Backup Strategy

**Database Backups**:
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump survey_app > "$BACKUP_DIR/survey_app_$DATE.sql"

# Keep only last 30 days
find $BACKUP_DIR -name "survey_app_*.sql" -mtime +30 -delete
```

**Automate with cron**:
```bash
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

### Scaling Considerations

**When to scale**:
- Database connections > 80% of pool
- Response time > 1 second
- Email queue backing up
- CPU > 70% sustained

**Scaling options**:
1. Vertical: Increase server resources
2. Horizontal: Add more app servers
3. Database: Read replicas, connection pooling
4. Caching: Add Redis for sessions and data
5. CDN: CloudFlare for static assets

## Troubleshooting

### Common Issues

**Issue**: Database connection refused
```
Solution:
- Check PostgreSQL is running
- Verify credentials in .env
- Check firewall rules
```

**Issue**: Emails not sending
```
Solution:
- Check SendGrid/Mailgun API key
- Verify sender domain
- Check email worker logs
- Test connection: npm run test:email
```

**Issue**: PDF generation fails
```
Solution:
- Check disk space
- Verify write permissions on pdfs/ directory
- Check PDFKit installation
```

**Issue**: Frontend can't connect to backend
```
Solution:
- Verify VITE_API_URL in frontend/.env
- Check CORS settings in backend
- Ensure backend is running
```

## Security Checklist

- [ ] Change default JWT secret
- [ ] Use strong database password
- [ ] Enable HTTPS in production
- [ ] Set secure CORS origins
- [ ] Rate limit API endpoints
- [ ] Validate all user inputs
- [ ] Sanitize HTML in emails
- [ ] Regular security updates
- [ ] Monitor for SQL injection attempts
- [ ] Implement proper error handling
- [ ] Don't expose stack traces in production

## Support

For issues or questions:
1. Check logs first
2. Review this guide
3. Check README.md
4. Contact development team

## Next Steps

After successful setup:
1. Create your first assessment
2. Test the complete flow
3. Configure email templates
4. Set up custom branding
5. Share with first clients
6. Monitor and optimize

Good luck with your Survey App!
