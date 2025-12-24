# Product Requirements Document (PRD)
## Scoreable Assessment & Survey Platform

**Version:** 1.0
**Last Updated:** December 2024
**Status:** Production Ready

---

## Executive Summary

A comprehensive SaaS platform that enables businesses to create, distribute, and monetize scoreable assessments and surveys. The platform provides automated PDF report generation, intelligent email nurturing sequences, custom branding, and AI-powered analytics to help clients position themselves as authorities in their niche.

### Key Value Proposition

- **For Platform Owners**: Monthly recurring revenue offering assessment services to clients
- **For Clients**: Professional assessment tools with branded delivery, custom domains, and AI insights
- **For Respondents**: Personalized reports and valuable insights based on their responses

---

## Table of Contents

1. [Product Vision & Goals](#product-vision--goals)
2. [User Personas](#user-personas)
3. [Core Features](#core-features)
4. [Technical Architecture](#technical-architecture)
5. [User Stories](#user-stories)
6. [Feature Specifications](#feature-specifications)
7. [Security & Compliance](#security--compliance)
8. [Success Metrics](#success-metrics)
9. [Future Roadmap](#future-roadmap)

---

## Product Vision & Goals

### Vision Statement

To become the leading platform for businesses to create and deliver professional, branded assessments that generate qualified leads and establish thought leadership.

### Primary Goals

1. **Revenue Generation**: Enable platform owners to offer assessment services as a monthly subscription
2. **Lead Qualification**: Help clients qualify and segment leads through scoreable assessments
3. **Brand Consistency**: Maintain client branding across all touchpoints (domains, emails, reports)
4. **Data-Driven Insights**: Provide AI-powered analytics for clients to create authoritative content
5. **Automation**: Streamline the entire assessment workflow from creation to nurturing

### Success Criteria

- Platform can support 100+ concurrent clients
- Clients can create and deploy assessments in under 30 minutes
- 90%+ email deliverability rate using client SMTP
- AI insights generated within 60 seconds
- 99.9% uptime for assessment delivery

---

## User Personas

### 1. Super Administrator (Platform Owner)

**Who They Are:**
- Platform owner/operator
- Manages multiple client accounts
- Technical proficiency: High

**Goals:**
- Maximize monthly recurring revenue
- Minimize support overhead
- Maintain platform stability
- Monitor system health

**Pain Points:**
- Client onboarding complexity
- Support ticket volume
- Platform customization requests

**Key Features:**
- Full system access
- User management
- Audit logging
- System monitoring

---

### 2. Client (Assessment Creator)

**Who They Are:**
- Business owners, consultants, coaches
- Marketing professionals
- Industry experts
- Technical proficiency: Medium

**Goals:**
- Generate qualified leads
- Position as industry authority
- Automate lead nurturing
- Gather market insights
- Maintain brand consistency

**Pain Points:**
- Generic assessment tools
- Manual follow-up processes
- Lack of data insights
- Difficult customization
- Poor email deliverability

**Key Features:**
- Assessment builder
- Custom branding
- Custom domains
- SMTP configuration
- AI analytics
- Email automation
- CRM integration

---

### 3. Respondent (Assessment Taker)

**Who They Are:**
- Potential customers/leads
- Industry professionals
- Self-assessment seekers
- Technical proficiency: Low to Medium

**Goals:**
- Gain personal insights
- Understand their position/score
- Receive actionable recommendations
- Access professional report

**Pain Points:**
- Long, complicated assessments
- No immediate feedback
- Generic results
- Spam follow-ups

**Key Features:**
- Simple, branded survey interface
- Instant PDF report
- Personalized recommendations
- Valuable nurturing content

---

## Core Features

### 1. Assessment Management

**Purpose:** Create and manage scoreable assessments with multiple question types and point-based scoring.

**Components:**
- Assessment builder with drag-and-drop interface
- 5-20 questions per assessment
- Multiple choice questions with point values
- Score ranges with custom descriptions
- Draft/Published/Archived states
- Industry and target avatar categorization

**User Flow:**
```
Client Login → Create Assessment → Add Questions →
Configure Scoring → Add Score Ranges → Customize Branding → Publish
```

---

### 2. PDF Report Generation

**Purpose:** Automatically generate personalized PDF reports based on assessment results.

**Components:**
- Dynamic PDF generation using PDFKit
- Score-based content selection
- Custom branding (logo, colors)
- Personalized recommendations
- Downloadable and email-delivered
- S3 storage for reports

**Technical Details:**
- Template-based PDF generation
- Async processing to prevent blocking
- Unique URLs for each report
- 30-day retention (configurable)

---

### 3. Email Automation

**Purpose:** Nurture leads through automated email sequences with branded communications.

**Components:**
- **Immediate Email:** Assessment results with PDF attachment
- **Nurturing Sequences:** Time-delayed follow-up emails
- **Score-Based Triggers:** Different sequences based on score ranges
- **Template Variables:** Personalization (name, score, company)
- **Custom SMTP:** Client's own email server
- **Email Analytics:** Delivery, open, click tracking

**Workflow:**
```
Assessment Submitted → Generate PDF → Send Report Email →
Schedule Nurture Sequence → Send Follow-ups (Day 1, 3, 7...)
```

---

### 4. Custom Domains

**Purpose:** Enable clients to host assessments on their own domains for maximum brand consistency.

**Components:**
- DNS verification (TXT records)
- CNAME routing configuration
- Domain ownership validation
- Automatic SSL support
- Domain activation/deactivation
- Access analytics per domain

**Setup Process:**
```
Add Domain → DNS Instructions → Add TXT Record → Verify →
Add CNAME Record → Activate → Assessment Available
```

---

### 5. SMTP Email Configuration

**Purpose:** Allow clients to send emails from their own domain using their email infrastructure.

**Components:**
- SMTP server configuration per client
- Assessment-level SMTP override option
- Connection testing before saving
- Branded email templates
- Password encryption
- Popular provider examples (Gmail, Office 365, SendGrid)

**Benefits:**
- Better deliverability using client's domain reputation
- Full brand control
- Independence from platform email limits
- Custom sender identity

---

### 6. Role-Based Access Control (RBAC)

**Purpose:** Secure multi-tenant architecture with granular permission management.

**Roles:**

| Role | Access Level | Capabilities |
|------|-------------|--------------|
| **Super Admin** | Full System | All features, user management, system config |
| **Assistant Admin** | Nearly Full | All features except deleting super admins |
| **Client** | Own Data Only | Create assessments, view own responses, configure settings |
| **Respondent** | Read-Only | View own assessment results only |

**Security Features:**
- JWT-based authentication
- Role-based middleware
- Audit logging for admin actions
- IP and user agent tracking
- Row-level data isolation

---

### 7. AI-Powered Analytics

**Purpose:** Generate actionable insights from assessment data to help clients create authoritative content.

**Powered By:** OpenAI GPT-4

**Features:**

**A. Comprehensive Insights**
- Key findings and patterns
- Audience behavior analysis
- Strategic recommendations
- Authority positioning guidance

**B. Quick Summaries**
- Executive summaries (2-3 sentences)
- Dashboard highlights
- At-a-glance metrics

**C. Content Suggestions**
- Report topics based on data
- Webinar ideas
- Video script concepts
- All tied to actual response data

**D. Trend Analysis**
- Response patterns over time
- Score trends
- Seasonal patterns
- Optimization recommendations

**Visualizations:**
- Bar charts (question responses)
- Pie charts (score distribution)
- Line charts (trends over time)
- Data tables with percentages

---

### 8. GoHighLevel (GHL) CRM Integration

**Purpose:** Seamlessly sync assessment data with CRM for comprehensive lead management.

**Components:**
- API key configuration
- Field mapping (custom fields)
- Contact upsert (create/update)
- Tag application
- Workflow triggering
- Sync logging and retry mechanism

**Data Synced:**
- Respondent name, email, phone
- Total score and score range
- Individual question answers
- Assessment completion timestamp
- Custom metadata

**Workflow:**
```
Assessment Submitted → Async GHL Sync → Create/Update Contact →
Apply Tags → Trigger Workflows → Log Result
```

---

### 9. User Management (Admin Only)

**Purpose:** Enable platform administrators to manage user accounts and roles.

**Features:**
- User listing with search/filter
- Create users with role assignment
- Update user details and subscriptions
- Role modification with protection rules
- User deletion (super admin only)
- User statistics dashboard
- Audit log viewing

**Protection Rules:**
- Assistant admins cannot delete super admins
- Assistant admins cannot modify super admin roles
- Users cannot delete themselves
- All actions logged for compliance

---

## Technical Architecture

### Tech Stack

**Backend:**
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL 14+
- **Authentication:** JWT with bcrypt
- **Email:** Nodemailer (SMTP)
- **PDF Generation:** PDFKit
- **AI:** OpenAI GPT-4
- **Storage:** AWS S3 (PDFs)
- **Scheduling:** node-cron

**Frontend:**
- **Framework:** React 18
- **Language:** TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Data Fetching:** React Query
- **Routing:** React Router v6
- **Charts:** Recharts
- **Notifications:** Sonner (toast)
- **Icons:** Lucide React

**Infrastructure:**
- **Hosting:** Configurable (AWS, DigitalOcean, etc.)
- **Database:** PostgreSQL with connection pooling
- **Storage:** S3 or compatible object storage
- **DNS:** Cloudflare recommended for custom domains
- **Email:** Client SMTP servers

---

### Database Schema

**Core Tables:**

1. **users** - User accounts with roles and SMTP config
2. **assessments** - Assessment definitions with branding
3. **questions** - Assessment questions
4. **answer_options** - Answer choices with point values
5. **score_ranges** - Score-based outcome definitions
6. **respondents** - Assessment takers
7. **responses** - Completed assessments
8. **respondent_answers** - Individual question responses
9. **email_sequences** - Nurturing email sequences
10. **email_templates** - Email content templates
11. **email_deliveries** - Email send tracking
12. **custom_domains** - Domain configurations
13. **ghl_integrations** - CRM integration settings
14. **analytics_snapshots** - Cached AI insights
15. **audit_logs** - Admin action tracking

**Materialized Views:**
- **answer_aggregations** - Pre-computed answer statistics
- **assessment_statistics** - Pre-computed assessment metrics

---

### Security Architecture

**Authentication:**
- JWT tokens with 7-day expiration
- bcrypt password hashing (10 rounds)
- Secure session management
- Token refresh mechanism

**Authorization:**
- Role-based middleware
- Resource ownership validation
- Admin action protection
- Audit trail for sensitive operations

**Data Security:**
- SMTP passwords encrypted
- API keys encrypted at rest
- Row-level tenant isolation
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS protection (helmet middleware)

**API Security:**
- CORS configuration
- Rate limiting (100 req/15min per IP)
- Helmet security headers
- HTTPS required in production

---

## User Stories

### For Platform Owner (Super Admin)

```
As a platform owner,
I want to create client accounts with appropriate roles,
So that I can onboard new clients and manage access levels.

Acceptance Criteria:
- Can create users with any role
- Can assign subscription tiers
- Receives confirmation of user creation
- New user can immediately log in
```

```
As a platform owner,
I want to view audit logs of all admin actions,
So that I can maintain compliance and security oversight.

Acceptance Criteria:
- Can view all admin actions
- Logs include user, action, timestamp, IP
- Can filter by user or action type
- Logs are immutable
```

---

### For Client (Assessment Creator)

```
As a client,
I want to create a branded assessment in under 30 minutes,
So that I can quickly launch lead generation campaigns.

Acceptance Criteria:
- Intuitive assessment builder
- Add 5-20 questions easily
- Set point values for answers
- Configure score ranges
- Upload logo and set colors
- Preview before publishing
```

```
As a client,
I want to send emails from my own domain,
So that my brand is consistent and deliverability is high.

Acceptance Criteria:
- Can enter SMTP server details
- Can test connection before saving
- Receives helpful error messages
- See provider examples (Gmail, etc.)
- Emails sent from my domain
```

```
As a client,
I want AI-generated insights from my assessment data,
So that I can create authoritative content and webinars.

Acceptance Criteria:
- Click to generate insights
- Receive analysis within 60 seconds
- See key findings and patterns
- Get content suggestions
- Export or copy insights
```

```
As a client,
I want assessment data synced to my CRM automatically,
So that I can follow up with leads in my existing workflow.

Acceptance Criteria:
- Configure GHL API key
- Map assessment fields to CRM fields
- Set up tag rules
- Trigger workflows
- See sync status and logs
```

---

### For Respondent (Assessment Taker)

```
As a respondent,
I want to complete an assessment quickly and easily,
So that I can receive my personalized results.

Acceptance Criteria:
- Clean, branded interface
- Progress indicator
- Clear questions
- Complete in under 10 minutes
- Mobile responsive
```

```
As a respondent,
I want to receive my results immediately via email,
So that I can review my report and recommendations.

Acceptance Criteria:
- Email arrives within 2 minutes
- Contains PDF attachment
- PDF is well-designed and branded
- Recommendations are relevant to my score
- Can download PDF
```

```
As a respondent,
I want to receive valuable follow-up content,
So that I can improve based on my assessment results.

Acceptance Criteria:
- Emails are relevant to my score
- Content is helpful, not spammy
- Unsubscribe option available
- Emails are professionally designed
- Branded from the company
```

---

## Feature Specifications

### Assessment Builder

**Interface:**
- Tabbed interface (Details, Questions, Scoring, Branding)
- Drag-and-drop question reordering
- Real-time preview
- Auto-save functionality

**Question Types:**
- Multiple choice (select one)
- Multiple select (select many)
- Support for 2-10 answer options per question

**Point Assignment:**
- Integer points per answer option
- Range: 0-100 points
- Visual indicator of point distribution

**Score Ranges:**
- Minimum 2, maximum 10 ranges
- Non-overlapping ranges
- Custom title and description per range
- Recommendations field
- PDF template customization per range

**Validation:**
- Title required
- Minimum 5 questions
- Each question requires 2+ options
- Score ranges must cover all possible scores
- No overlapping ranges

---

### Email Automation

**Sequence Types:**

1. **Immediate Trigger**
   - Sent immediately after assessment completion
   - Contains PDF report
   - Personalized with score and name

2. **Time-Delayed**
   - Day 1, 3, 7, 14, 30 (configurable)
   - Nurturing content
   - Score-agnostic or score-specific

3. **Score-Based**
   - Different sequences for different score ranges
   - Targeted content based on results
   - High scorers vs. low scorers

**Template Variables:**
```
{{name}} - Respondent name
{{email}} - Respondent email
{{company}} - Respondent company
{{score}} - Total score
{{score_range}} - Score range title
{{assessment_title}} - Assessment name
{{pdf_url}} - PDF report link
```

**Email Tracking:**
- Sent timestamp
- Delivered timestamp
- Opened timestamp
- Clicked timestamp
- Bounce detection
- Failure logging

---

### Analytics Dashboard

**Metrics Displayed:**

**Overview Cards:**
- Total responses
- Completion rate
- Average score
- Score range (min-max)

**Charts:**
- Score distribution (pie chart)
- Response trends (line chart, 30 days)
- Question analysis (bar charts)
- Answer distribution (percentages)

**AI Insights Section:**
- Generate button
- Loading state
- Markdown rendering
- Copy to clipboard
- Regenerate option

**Content Suggestions:**
- 3 report topics
- 3 webinar ideas
- 3 video script concepts
- Based on actual data patterns

**Export Options:**
- PDF export of analytics
- CSV export of raw data
- Share link for insights

---

### Custom Domain Setup

**DNS Configuration Required:**

1. **TXT Record** (Verification)
   ```
   _survey-verification.example.com → verification_token_here
   ```

2. **CNAME Record** (Routing)
   ```
   quiz.example.com → your-platform.com
   ```

**Verification Process:**
1. Client adds domain
2. System generates verification token
3. Client adds TXT record to DNS
4. System checks TXT record every 5 minutes
5. Once verified, client adds CNAME
6. Client activates domain
7. Assessment available at custom domain

**Status Indicators:**
- Pending verification
- TXT verified
- CNAME configured
- Active
- Failed verification
- Inactive

---

## Security & Compliance

### Data Protection

**Encryption:**
- HTTPS/TLS for all connections
- Passwords hashed with bcrypt
- SMTP passwords encrypted at rest
- API keys encrypted
- JWT secret rotation policy

**Data Isolation:**
- Multi-tenant architecture
- Row-level security
- User ID foreign keys on all tables
- Middleware ownership checks
- Admin override with audit logging

**Backup & Recovery:**
- Daily database backups
- 30-day retention
- Point-in-time recovery
- S3 backup for PDFs

---

### Compliance

**GDPR Compliance:**
- Right to access (user can export data)
- Right to deletion (admin can delete users)
- Data minimization (collect only necessary data)
- Consent tracking for email subscriptions
- Unsubscribe links in all emails

**CAN-SPAM Compliance:**
- Unsubscribe mechanism
- Physical address in emails
- Clear sender identification
- Honor unsubscribe within 10 days

**SOC 2 Readiness:**
- Audit logging of all admin actions
- Access control with RBAC
- Change tracking
- Security monitoring

---

### Privacy

**Data Retention:**
- Responses: Indefinite (or configurable)
- PDF Reports: 30 days (or configurable)
- Email logs: 90 days
- Audit logs: 1 year minimum

**User Rights:**
- Respondents can request data deletion
- Clients can export all their data
- Admins can view audit trail

---

## Success Metrics

### Platform Metrics

**Usage:**
- Monthly Active Users (MAU)
- Assessments created per month
- Responses collected per month
- Average responses per assessment

**Performance:**
- API response time (< 200ms avg)
- PDF generation time (< 5s)
- AI insights generation time (< 60s)
- Email delivery rate (> 95%)
- Uptime (> 99.9%)

**Business:**
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (LTV)
- Churn rate (< 5% monthly)
- Net Promoter Score (NPS)

---

### Client Success Metrics

**Lead Generation:**
- Conversion rate (visitor → respondent)
- Lead quality score
- Cost per qualified lead
- Time to first response

**Engagement:**
- Email open rates (> 25%)
- Email click rates (> 5%)
- PDF download rate
- Follow-up engagement rate

**ROI:**
- Leads generated per month
- Revenue attributed to assessment leads
- Time saved vs. manual process
- Brand consistency score

---

## Future Roadmap

### Phase 2 (Q1 2025)

**Features:**
- [ ] Conditional logic (skip patterns)
- [ ] Matrix questions
- [ ] File upload questions
- [ ] Multi-language support
- [ ] White-label portal
- [ ] API for third-party integrations

**Integrations:**
- [ ] HubSpot CRM
- [ ] Salesforce
- [ ] ActiveCampaign
- [ ] Zapier
- [ ] Webhooks

**Analytics:**
- [ ] A/B testing for assessments
- [ ] Conversion funnel tracking
- [ ] Attribution tracking
- [ ] Advanced segmentation

---

### Phase 3 (Q2 2025)

**Features:**
- [ ] Team collaboration
- [ ] Assessment templates marketplace
- [ ] Video in questions/results
- [ ] Gamification (badges, leaderboards)
- [ ] Mobile app for clients
- [ ] Offline assessment mode

**Enterprise:**
- [ ] SSO/SAML integration
- [ ] Custom SLA agreements
- [ ] Dedicated infrastructure
- [ ] Advanced analytics
- [ ] Priority support

---

### Phase 4 (Q3 2025)

**AI Enhancements:**
- [ ] AI-generated questions
- [ ] AI-optimized scoring
- [ ] Predictive analytics
- [ ] Sentiment analysis
- [ ] Auto-responder AI

**Marketplace:**
- [ ] Template store
- [ ] Professional services
- [ ] Partner program
- [ ] Referral system
- [ ] Affiliate program

---

## Technical Requirements

### Minimum Server Requirements

**Production:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 100GB SSD
- Bandwidth: 1TB/month
- Database: PostgreSQL 14+
- Node.js: 18+

**Recommended:**
- CPU: 8 cores
- RAM: 16GB
- Storage: 500GB SSD
- Bandwidth: 5TB/month
- CDN for static assets
- Redis for caching

---

### Third-Party Services

**Required:**
- PostgreSQL database
- S3-compatible storage
- OpenAI API (for analytics)
- Domain registrar (for custom domains)

**Optional:**
- SendGrid/Mailgun (if client doesn't provide SMTP)
- Cloudflare (for CDN and DNS)
- Sentry (for error tracking)
- Google Analytics
- Stripe (for payments)

---

### Browser Support

**Supported Browsers:**
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

**Mobile:**
- iOS Safari 14+ ✅
- Chrome Android 90+ ✅

---

## Deployment Guide

### Initial Setup

1. **Database Setup**
   ```bash
   createdb survey_app
   psql survey_app < migrations/001_initial_schema.sql
   psql survey_app < migrations/002_custom_domains.sql
   psql survey_app < migrations/003_ghl_integration.sql
   psql survey_app < migrations/004_rbac_and_analytics.sql
   psql survey_app < migrations/005_smtp_config.sql
   ```

2. **Environment Configuration**
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env with your values
   ```

3. **Install Dependencies**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

5. **Start Backend**
   ```bash
   cd backend
   npm run start
   ```

---

### Environment Variables

**Required:**
```bash
DB_HOST=localhost
DB_NAME=survey_app
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
OPENAI_API_KEY=sk-...
```

**Optional:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_password
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

---

## Support & Maintenance

### Monitoring

**Health Checks:**
- `/health` endpoint
- Database connectivity
- Email service status
- Storage availability
- AI service status

**Logging:**
- Application logs (Winston)
- Error tracking (Sentry recommended)
- Audit logs (database)
- Email delivery logs

**Alerts:**
- Server down
- High error rate
- Email delivery failure
- Database connection issues
- Storage quota exceeded

---

### Backup Strategy

**Database:**
- Daily full backup
- Hourly incremental backups
- 30-day retention
- Off-site storage

**Files:**
- S3 with versioning
- Cross-region replication
- Lifecycle policies

**Code:**
- Git repository
- Tagged releases
- Branch protection

---

## Glossary

**Assessment:** Scoreable survey with point-based questions and outcomes

**Respondent:** Person taking an assessment

**Client:** Business using the platform to create assessments

**Score Range:** Outcome category based on total points (e.g., "Beginner", "Expert")

**SMTP:** Simple Mail Transfer Protocol - email sending configuration

**JWT:** JSON Web Token - authentication mechanism

**RBAC:** Role-Based Access Control - permission system

**GHL:** GoHighLevel - CRM integration

**Materialized View:** Pre-computed database query results for performance

**S3:** Object storage (AWS S3 or compatible)

---

## Appendix

### API Endpoints Summary

**Authentication:**
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`

**Assessments:**
- GET/POST `/api/assessments`
- GET/PATCH/DELETE `/api/assessments/:id`
- POST `/api/assessments/:id/publish`

**Responses:**
- GET `/api/responses/public/:slug`
- POST `/api/responses/public/:slug/submit`
- GET `/api/responses/assessment/:assessmentId`

**Analytics:**
- GET `/api/analytics/assessments/:id/overview`
- POST `/api/analytics/assessments/:id/generate-insights`

**Admin:**
- GET/POST `/api/admin/users`
- PATCH `/api/admin/users/:id/role`
- GET `/api/admin/users/audit-logs/all`

**SMTP:**
- GET/POST/DELETE `/api/smtp-settings`
- POST `/api/smtp-settings/test`

**Custom Domains:**
- GET/POST `/api/custom-domains`
- POST `/api/custom-domains/:id/verify`

**GHL Integration:**
- GET/POST `/api/ghl-integrations`
- POST `/api/ghl-integrations/test`

---

### Database Schema Diagram

```
users (1) ----< (N) assessments
                    |
                    +----< (N) questions
                    |           |
                    |           +----< (N) answer_options
                    |
                    +----< (N) score_ranges
                    |
                    +----< (N) responses
                                |
                                +----< (N) respondent_answers

users (1) ----< (N) custom_domains
users (1) ----< (N) ghl_integrations
assessments (1) ----< (N) email_sequences
                            |
                            +----< (N) email_templates
```

---

### Changelog

**v1.0.0** - December 2024
- Initial release
- Core assessment functionality
- PDF generation
- Email automation
- Custom domains
- SMTP configuration
- RBAC system
- AI analytics
- GHL integration
- User management

---

**Document End**

For questions or clarifications, contact: [Platform Owner]
