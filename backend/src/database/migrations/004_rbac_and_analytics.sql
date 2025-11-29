-- Migration 004: Role-Based Access Control (RBAC) and Analytics
-- Description: Adds user roles, audit logging, and analytics aggregation support

-- Create user role enum
CREATE TYPE user_role AS ENUM ('super_admin', 'assistant_admin', 'client', 'respondent');

-- Add role column to users table
ALTER TABLE users ADD COLUMN role user_role NOT NULL DEFAULT 'client';

-- Add created_by to track who created each user
ALTER TABLE users ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create audit log table for tracking admin actions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create analytics snapshots table for caching AI-generated insights
CREATE TABLE analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_responses INTEGER NOT NULL DEFAULT 0,
    date_range_start TIMESTAMP WITH TIME ZONE,
    date_range_end TIMESTAMP WITH TIME ZONE,
    question_stats JSONB NOT NULL, -- Aggregated answer counts per question
    ai_insights TEXT, -- AI-generated narrative
    ai_generated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_snapshots_assessment ON analytics_snapshots(assessment_id);
CREATE INDEX idx_analytics_snapshots_user ON analytics_snapshots(user_id);

-- Trigger for analytics_snapshots updated_at
CREATE TRIGGER update_analytics_snapshots_updated_at
    BEFORE UPDATE ON analytics_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for quick answer aggregations
CREATE MATERIALIZED VIEW answer_aggregations AS
SELECT
    a.id AS assessment_id,
    a.user_id,
    q.id AS question_id,
    q.question_text,
    q.question_order,
    ao.id AS answer_option_id,
    ao.answer_text,
    ao.points,
    COUNT(ra.id) AS response_count,
    AVG(ao.points) AS avg_points
FROM assessments a
JOIN questions q ON q.assessment_id = a.id
JOIN answer_options ao ON ao.question_id = q.id
LEFT JOIN respondent_answers ra ON ra.answer_option_id = ao.id
GROUP BY a.id, a.user_id, q.id, q.question_text, q.question_order, ao.id, ao.answer_text, ao.points;

CREATE UNIQUE INDEX idx_answer_aggregations_unique
    ON answer_aggregations(assessment_id, question_id, answer_option_id);

CREATE INDEX idx_answer_aggregations_assessment
    ON answer_aggregations(assessment_id);

CREATE INDEX idx_answer_aggregations_user
    ON answer_aggregations(user_id);

-- Function to refresh answer aggregations
CREATE OR REPLACE FUNCTION refresh_answer_aggregations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY answer_aggregations;
END;
$$;

-- Create view for overall assessment statistics
CREATE VIEW assessment_statistics AS
SELECT
    a.id AS assessment_id,
    a.user_id,
    a.title,
    COUNT(DISTINCT resp.id) AS total_responses,
    COUNT(DISTINCT CASE WHEN resp.completed_at IS NOT NULL THEN resp.id END) AS completed_responses,
    ROUND(AVG(CASE WHEN resp.total_score IS NOT NULL THEN resp.total_score END), 2) AS avg_score,
    MIN(resp.total_score) AS min_score,
    MAX(resp.total_score) AS max_score,
    MIN(resp.created_at) AS first_response_date,
    MAX(resp.created_at) AS last_response_date
FROM assessments a
LEFT JOIN responses resp ON resp.assessment_id = a.id
GROUP BY a.id, a.user_id, a.title;

-- Add indexes for performance
CREATE INDEX idx_responses_assessment_completed ON responses(assessment_id, completed_at);
CREATE INDEX idx_responses_total_score ON responses(assessment_id, total_score) WHERE total_score IS NOT NULL;

-- Insert initial super admin role (you'll need to update this with actual user)
-- This is a placeholder - update after migration
COMMENT ON COLUMN users.role IS 'User role: super_admin (full access), assistant_admin (full access except deleting super admins), client (access to own data), respondent (read-only access to own responses)';
