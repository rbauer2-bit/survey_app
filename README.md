# Survey App - Scoreable Assessment Platform

A full-stack SaaS application for creating scoreable assessments/surveys with PDF reports and email nurturing sequences. Perfect for lead qualification and client engagement.

## Features

### Core Functionality
- **Multi-tenant Architecture**: Each client can create and manage multiple assessments
- **Assessment Builder**: Create 5-20 question surveys with multiple choice answers
- **Scoring System**: Assign point values to each answer option
- **PDF Reports**: Automatically generate customized PDF reports based on scores
- **Email Automation**: Send reports and trigger nurturing email sequences
- **Public Survey Pages**: Shareable links for respondents to take assessments
- **Analytics Dashboard**: Track responses, scores, and distributions
- **Industry Adaptable**: Customize assessments for different industries and target avatars

### Technical Features
- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: PostgreSQL with UUID primary keys
- **Authentication**: JWT-based auth with bcrypt password hashing
- **PDF Generation**: PDFKit for custom report generation
- **Email Service**: SendGrid/Mailgun integration
- **API**: RESTful API with validation and error handling

## Project Structure

```
survey_app/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── database/        # Migrations and schema
│   │   ├── models/          # Data models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── services/        # PDF, email services
│   │   ├── workers/         # Background email worker
│   │   ├── utils/           # Helper functions
│   │   ├── types/           # TypeScript types
│   │   └── server.ts        # Main server file
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── lib/             # API client
│   │   ├── stores/          # State management
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── package.json
│   └── vite.config.ts
│
└── DATABASE_SCHEMA.md       # Complete database schema
```

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- SendGrid or Mailgun account (for emails)
- AWS S3 bucket (optional, for PDF storage)

### Backend Setup

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Create database**:
   ```bash
   createdb survey_app
   ```

4. **Run migrations**:
   ```bash
   psql -d survey_app -f src/database/migrations/001_initial_schema.sql
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:5000`

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Environment Variables

### Backend (.env)

```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=survey_app
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=Survey App

# AWS (for PDF storage)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=survey-app-pdfs
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Survey App
```

## API Documentation

### Authentication

#### POST /api/auth/register
Register a new user.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "company_name": "Acme Corp"
}
```

**Response**:
```json
{
  "message": "User registered successfully",
  "user": { "id": "...", "email": "...", "name": "..." },
  "token": "jwt_token_here"
}
```

#### POST /api/auth/login
Login with email and password.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

### Assessments

#### POST /api/assessments
Create a new assessment.

**Request**:
```json
{
  "title": "Marketing Maturity Assessment",
  "description": "Evaluate your marketing capabilities",
  "industry": "Marketing",
  "target_avatar": "Small Business Owners"
}
```

#### GET /api/assessments
Get all assessments for the authenticated user.

#### GET /api/assessments/:id
Get assessment details including questions and score ranges.

#### POST /api/assessments/:id/questions
Add a question to an assessment.

**Request**:
```json
{
  "question_text": "How many leads do you generate monthly?",
  "question_type": "single_choice",
  "order_index": 0,
  "answer_options": [
    { "option_text": "0-50", "point_value": 0 },
    { "option_text": "51-200", "point_value": 5 },
    { "option_text": "201-500", "point_value": 10 },
    { "option_text": "500+", "point_value": 15 }
  ]
}
```

#### POST /api/assessments/:id/score-ranges
Add a score range to an assessment.

**Request**:
```json
{
  "range_name": "Beginner",
  "min_score": 0,
  "max_score": 30,
  "description": "You're just getting started with marketing.",
  "recommendations": "Focus on building your foundation..."
}
```

### Public Responses

#### GET /api/responses/public/:slug
Get public assessment by slug (no auth required).

#### POST /api/responses/public/:slug/submit
Submit an assessment response (no auth required).

**Request**:
```json
{
  "respondent": {
    "email": "lead@example.com",
    "name": "Jane Smith",
    "company": "ABC Inc"
  },
  "answers": [
    {
      "question_id": "question-uuid",
      "answer_option_id": "option-uuid"
    }
  ]
}
```

**Response**:
```json
{
  "message": "Assessment submitted successfully",
  "response": {
    "id": "response-uuid",
    "total_score": 45,
    "score_range": {
      "range_name": "Intermediate",
      "description": "..."
    }
  }
}
```

### Email Sequences

#### POST /api/email-sequences
Create an email sequence.

**Request**:
```json
{
  "assessment_id": "assessment-uuid",
  "name": "Post-Assessment Nurture",
  "trigger_type": "immediate"
}
```

#### POST /api/email-sequences/:id/templates
Add an email template to a sequence.

**Request**:
```json
{
  "subject": "Your Assessment Results",
  "body_html": "<p>Hello {{name}},</p>...",
  "body_text": "Hello {{name}},...",
  "delay_days": 0,
  "order_index": 0
}
```

## Database Schema

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete schema documentation.

### Key Tables
- **users**: Assessment creators (your clients)
- **assessments**: Survey definitions
- **questions**: Individual survey questions
- **answer_options**: Possible answers with point values
- **score_ranges**: Score-based outcome categories
- **respondents**: People who take assessments (leads)
- **responses**: Completed assessment submissions
- **email_sequences**: Automated email campaigns
- **email_templates**: Individual emails in sequences
- **email_deliveries**: Email send tracking

## Deployment

### PostgreSQL Database

1. Create production database
2. Run migrations
3. Set up backups

### Backend Deployment

Recommended platforms: Heroku, Railway, DigitalOcean App Platform, AWS Elastic Beanstalk

1. Build the TypeScript code:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

3. Set environment variables in your hosting platform

### Frontend Deployment

Recommended platforms: Vercel, Netlify, Cloudflare Pages

1. Build the production bundle:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder

3. Configure environment variables

### Email Service Setup

#### SendGrid
1. Sign up at sendgrid.com
2. Create an API key
3. Verify your sender domain
4. Add API key to environment variables

#### Mailgun
1. Sign up at mailgun.com
2. Add and verify your domain
3. Get your API key
4. Add credentials to environment variables

## Usage Guide

### For SaaS Owner (You)

1. **Onboard Client**:
   - Create account for your client
   - Set subscription tier

2. **Help Client Create Assessment**:
   - Define industry and target avatar
   - Create questions with point values
   - Set up score ranges
   - Configure email sequences

3. **Client Shares Assessment**:
   - Publish the assessment
   - Share the public URL

4. **Monitor Results**:
   - Track responses
   - View analytics
   - Export data

### For Your Clients

1. **Create Assessment**:
   - Log in to dashboard
   - Click "New Assessment"
   - Fill in basic information
   - Add questions and answers
   - Set point values
   - Define score ranges
   - Create email templates

2. **Publish and Share**:
   - Click "Publish"
   - Copy public URL
   - Share with leads

3. **Track Results**:
   - View responses
   - Analyze score distribution
   - Monitor email engagement

### For Respondents (Leads)

1. Click on shared assessment link
2. Fill in contact information
3. Answer all questions
4. Submit assessment
5. Receive PDF report via email
6. Get nurturing emails over time

## Customization

### PDF Templates
Edit `backend/src/services/pdfService.ts` to customize PDF design.

### Email Templates
Create custom HTML email templates in the UI or via API.

### Branding
Configure colors, logos, and styling per assessment via `branding_config`.

### Scoring Logic
Modify point values and score ranges to match your criteria.

## Maintenance

### Backup Database
```bash
pg_dump survey_app > backup_$(date +%Y%m%d).sql
```

### Monitor Email Delivery
Check `email_deliveries` table for failed sends.

### Clear Old PDFs
Implement cleanup script for old PDF files.

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- SQL injection prevention (parameterized queries)
- XSS protection
- CORS configuration
- Rate limiting
- Input validation
- Error handling

## Support and Development

### Common Issues

**Database connection fails**:
- Check PostgreSQL is running
- Verify credentials in `.env`

**Emails not sending**:
- Verify API keys
- Check SendGrid/Mailgun dashboard
- Review email worker logs

**PDF generation fails**:
- Check disk space
- Verify PDFKit installation
- Review error logs

## License

MIT

## Contributing

This is a proprietary SaaS application. For modifications or questions, contact the development team.

## Roadmap

- [ ] Analytics dashboard with charts
- [ ] Advanced email template editor
- [ ] A/B testing for email sequences
- [ ] Integrations (Zapier, Make, HubSpot)
- [ ] White-label capabilities
- [ ] Mobile app
- [ ] Advanced reporting and exports
- [ ] Payment processing for subscription management
