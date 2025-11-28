-- GHL Integration Migration
-- This migration adds support for GoHighLevel CRM integration

-- GHL integrations table (stores API credentials per user)
CREATE TABLE ghl_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id VARCHAR(255) NOT NULL, -- GHL Location ID
    api_key TEXT NOT NULL, -- Encrypted API key
    is_active BOOLEAN DEFAULT true,
    webhook_url VARCHAR(500), -- For receiving GHL webhooks
    webhook_secret VARCHAR(255), -- For webhook verification
    last_sync_at TIMESTAMP,
    sync_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, location_id)
);

-- GHL field mappings (map assessment fields to GHL custom fields)
CREATE TABLE ghl_field_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES ghl_integrations(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    source_field VARCHAR(100) NOT NULL, -- 'score', 'score_range', 'question_X', 'respondent_email', etc.
    ghl_field_key VARCHAR(255) NOT NULL, -- GHL custom field key
    ghl_field_type VARCHAR(50), -- 'text', 'number', 'date', 'boolean', etc.
    transform_function VARCHAR(50), -- Optional: 'uppercase', 'lowercase', 'format_date', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GHL sync log (track all syncs to GHL)
CREATE TABLE ghl_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES ghl_integrations(id) ON DELETE CASCADE,
    response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    ghl_contact_id VARCHAR(255), -- GHL contact ID returned by API
    sync_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'tag', 'workflow'
    sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retrying'
    request_payload JSONB,
    response_payload JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GHL workflow triggers (configure which GHL workflows to trigger)
CREATE TABLE ghl_workflow_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES ghl_integrations(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    score_range_id UUID REFERENCES score_ranges(id) ON DELETE SET NULL,
    ghl_workflow_id VARCHAR(255) NOT NULL, -- GHL workflow/campaign ID
    trigger_type VARCHAR(50) DEFAULT 'score_range', -- 'score_range', 'all_completions', 'score_threshold'
    trigger_condition JSONB DEFAULT '{}', -- Additional conditions
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GHL tags (configure tags to apply)
CREATE TABLE ghl_tag_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES ghl_integrations(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    score_range_id UUID REFERENCES score_ranges(id) ON DELETE SET NULL,
    tag_name VARCHAR(255) NOT NULL,
    apply_on VARCHAR(50) DEFAULT 'completion', -- 'completion', 'score_range'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_ghl_integrations_user_id ON ghl_integrations(user_id);
CREATE INDEX idx_ghl_integrations_is_active ON ghl_integrations(is_active);
CREATE INDEX idx_ghl_field_mappings_integration_id ON ghl_field_mappings(integration_id);
CREATE INDEX idx_ghl_field_mappings_assessment_id ON ghl_field_mappings(assessment_id);
CREATE INDEX idx_ghl_sync_log_integration_id ON ghl_sync_log(integration_id);
CREATE INDEX idx_ghl_sync_log_response_id ON ghl_sync_log(response_id);
CREATE INDEX idx_ghl_sync_log_sync_status ON ghl_sync_log(sync_status);
CREATE INDEX idx_ghl_workflow_triggers_integration_id ON ghl_workflow_triggers(integration_id);
CREATE INDEX idx_ghl_workflow_triggers_assessment_id ON ghl_workflow_triggers(assessment_id);
CREATE INDEX idx_ghl_tag_rules_integration_id ON ghl_tag_rules(integration_id);

-- Triggers for updated_at
CREATE TRIGGER update_ghl_integrations_updated_at
    BEFORE UPDATE ON ghl_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ghl_field_mappings_updated_at
    BEFORE UPDATE ON ghl_field_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ghl_workflow_triggers_updated_at
    BEFORE UPDATE ON ghl_workflow_triggers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE ghl_integrations IS 'Stores GHL API credentials and configuration per user';
COMMENT ON TABLE ghl_field_mappings IS 'Maps assessment fields to GHL custom fields';
COMMENT ON TABLE ghl_sync_log IS 'Logs all data syncs to GHL for audit and retry';
COMMENT ON TABLE ghl_workflow_triggers IS 'Configures which GHL workflows to trigger based on assessment results';
COMMENT ON TABLE ghl_tag_rules IS 'Configures which tags to apply to contacts based on assessment results';
