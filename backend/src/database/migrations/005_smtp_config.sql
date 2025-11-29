-- Migration 005: Add SMTP Email Configuration per User
-- Description: Allows each client to configure their own SMTP server for brand consistency

-- Add SMTP configuration to users table
ALTER TABLE users ADD COLUMN smtp_config JSONB DEFAULT NULL;

-- SMTP config structure:
-- {
--   "host": "smtp.example.com",
--   "port": 587,
--   "secure": false,
--   "auth": {
--     "user": "user@example.com",
--     "pass": "encrypted_password"
--   },
--   "from_email": "noreply@example.com",
--   "from_name": "Company Name"
-- }

COMMENT ON COLUMN users.smtp_config IS 'SMTP email server configuration for sending branded emails. Encrypted password stored in auth.pass';

-- Add SMTP configuration to assessments for assessment-specific email settings (optional override)
ALTER TABLE assessments ADD COLUMN smtp_config JSONB DEFAULT NULL;

COMMENT ON COLUMN assessments.smtp_config IS 'Optional SMTP override for this assessment. Falls back to user SMTP config if not set';

-- Create indexes for faster lookups
CREATE INDEX idx_users_smtp_config ON users USING gin(smtp_config) WHERE smtp_config IS NOT NULL;
CREATE INDEX idx_assessments_smtp_config ON assessments USING gin(smtp_config) WHERE smtp_config IS NOT NULL;
