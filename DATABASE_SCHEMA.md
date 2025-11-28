# Database Schema Design

## Overview
Multi-tenant SaaS application for creating scoreable assessments/surveys with PDF reports and email nurturing.

## Tables

### users
Primary users who manage assessments (your clients)
```sql
- id: UUID PRIMARY KEY
- email: VARCHAR(255) UNIQUE NOT NULL
- password_hash: VARCHAR(255) NOT NULL
- name: VARCHAR(255) NOT NULL
- company_name: VARCHAR(255)
- subscription_tier: ENUM('free', 'basic', 'pro', 'enterprise')
- subscription_status: ENUM('active', 'inactive', 'trial', 'cancelled')
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### assessments
The surveys/assessments created by users
```sql
- id: UUID PRIMARY KEY
- user_id: UUID FOREIGN KEY -> users.id
- title: VARCHAR(255) NOT NULL
- description: TEXT
- industry: VARCHAR(100)
- target_avatar: VARCHAR(100)
- slug: VARCHAR(255) UNIQUE (for public URLs)
- status: ENUM('draft', 'published', 'archived')
- branding_config: JSONB (colors, logo, etc.)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### questions
Individual questions within assessments
```sql
- id: UUID PRIMARY KEY
- assessment_id: UUID FOREIGN KEY -> assessments.id
- question_text: TEXT NOT NULL
- question_type: ENUM('multiple_choice', 'single_choice')
- order_index: INTEGER NOT NULL
- required: BOOLEAN DEFAULT true
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### answer_options
Possible answers for each question
```sql
- id: UUID PRIMARY KEY
- question_id: UUID FOREIGN KEY -> questions.id
- option_text: TEXT NOT NULL
- point_value: INTEGER NOT NULL
- order_index: INTEGER NOT NULL
- created_at: TIMESTAMP
```

### score_ranges
Define outcome ranges based on total score
```sql
- id: UUID PRIMARY KEY
- assessment_id: UUID FOREIGN KEY -> assessments.id
- range_name: VARCHAR(255) NOT NULL (e.g., "Beginner", "Intermediate", "Expert")
- min_score: INTEGER NOT NULL
- max_score: INTEGER NOT NULL
- description: TEXT
- recommendations: TEXT
- pdf_template_config: JSONB
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### respondents
People who take the assessments (leads)
```sql
- id: UUID PRIMARY KEY
- email: VARCHAR(255) NOT NULL
- name: VARCHAR(255)
- phone: VARCHAR(50)
- company: VARCHAR(255)
- metadata: JSONB (additional custom fields)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### responses
Completed assessment submissions
```sql
- id: UUID PRIMARY KEY
- assessment_id: UUID FOREIGN KEY -> assessments.id
- respondent_id: UUID FOREIGN KEY -> respondents.id
- total_score: INTEGER NOT NULL
- score_range_id: UUID FOREIGN KEY -> score_ranges.id
- completed_at: TIMESTAMP NOT NULL
- pdf_generated: BOOLEAN DEFAULT false
- pdf_url: VARCHAR(500)
- email_sent: BOOLEAN DEFAULT false
- created_at: TIMESTAMP
```

### response_answers
Individual answers for each response
```sql
- id: UUID PRIMARY KEY
- response_id: UUID FOREIGN KEY -> responses.id
- question_id: UUID FOREIGN KEY -> questions.id
- answer_option_id: UUID FOREIGN KEY -> answer_options.id
- created_at: TIMESTAMP
```

### email_sequences
Nurturing email sequences for each assessment
```sql
- id: UUID PRIMARY KEY
- assessment_id: UUID FOREIGN KEY -> assessments.id
- name: VARCHAR(255) NOT NULL
- trigger_type: ENUM('immediate', 'score_based', 'time_delayed')
- score_range_id: UUID FOREIGN KEY -> score_ranges.id (optional, for score-based)
- active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### email_templates
Individual emails in a sequence
```sql
- id: UUID PRIMARY KEY
- sequence_id: UUID FOREIGN KEY -> email_sequences.id
- subject: VARCHAR(255) NOT NULL
- body_html: TEXT NOT NULL
- body_text: TEXT NOT NULL
- delay_days: INTEGER NOT NULL (0 for immediate)
- order_index: INTEGER NOT NULL
- active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### email_deliveries
Track email sends and engagement
```sql
- id: UUID PRIMARY KEY
- response_id: UUID FOREIGN KEY -> responses.id
- email_template_id: UUID FOREIGN KEY -> email_templates.id
- sent_at: TIMESTAMP
- delivered_at: TIMESTAMP
- opened_at: TIMESTAMP
- clicked_at: TIMESTAMP
- status: ENUM('scheduled', 'sent', 'delivered', 'failed', 'bounced')
- error_message: TEXT
```

## Indexes
```sql
CREATE INDEX idx_assessments_user_id ON assessments(user_id);
CREATE INDEX idx_assessments_slug ON assessments(slug);
CREATE INDEX idx_questions_assessment_id ON questions(assessment_id);
CREATE INDEX idx_answer_options_question_id ON answer_options(question_id);
CREATE INDEX idx_responses_assessment_id ON responses(assessment_id);
CREATE INDEX idx_responses_respondent_id ON responses(respondent_id);
CREATE INDEX idx_response_answers_response_id ON response_answers(response_id);
CREATE INDEX idx_email_deliveries_response_id ON email_deliveries(response_id);
CREATE INDEX idx_respondents_email ON respondents(email);
```

## Multi-Tenancy Strategy
- Each user (your client) can create multiple assessments
- Data is isolated by user_id at the assessment level
- Row-level security can be implemented for additional protection
- Each assessment has a unique slug for public access
