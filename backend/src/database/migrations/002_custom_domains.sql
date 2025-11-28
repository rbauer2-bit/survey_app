-- Custom Domains Migration
-- This migration adds support for custom domain mapping to assessments

-- Custom domains table
CREATE TABLE custom_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    subdomain VARCHAR(255),
    full_domain VARCHAR(255) UNIQUE NOT NULL, -- Computed: subdomain.domain or just domain
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
    verification_method VARCHAR(50) DEFAULT 'dns' CHECK (verification_method IN ('dns', 'file', 'auto')),
    verification_token VARCHAR(255) UNIQUE NOT NULL,
    verified_at TIMESTAMP,
    ssl_status VARCHAR(50) DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'failed', 'none')),
    ssl_issued_at TIMESTAMP,
    is_active BOOLEAN DEFAULT false,
    dns_configured BOOLEAN DEFAULT false,
    last_checked_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Domain verification records (for DNS TXT record verification)
CREATE TABLE domain_verification_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_domain_id UUID NOT NULL REFERENCES custom_domains(id) ON DELETE CASCADE,
    record_type VARCHAR(10) NOT NULL, -- TXT, CNAME, A
    record_name VARCHAR(255) NOT NULL,
    record_value TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Domain access logs (track which domains are being accessed)
CREATE TABLE domain_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    custom_domain_id UUID NOT NULL REFERENCES custom_domains(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_status INTEGER
);

-- Create indexes for custom domains
CREATE INDEX idx_custom_domains_user_id ON custom_domains(user_id);
CREATE INDEX idx_custom_domains_assessment_id ON custom_domains(assessment_id);
CREATE INDEX idx_custom_domains_full_domain ON custom_domains(full_domain);
CREATE INDEX idx_custom_domains_verification_status ON custom_domains(verification_status);
CREATE INDEX idx_custom_domains_is_active ON custom_domains(is_active);
CREATE INDEX idx_domain_verification_records_custom_domain_id ON domain_verification_records(custom_domain_id);
CREATE INDEX idx_domain_access_logs_custom_domain_id ON domain_access_logs(custom_domain_id);
CREATE INDEX idx_domain_access_logs_accessed_at ON domain_access_logs(accessed_at);

-- Trigger for custom_domains updated_at
CREATE TRIGGER update_custom_domains_updated_at
    BEFORE UPDATE ON custom_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically set full_domain
CREATE OR REPLACE FUNCTION set_full_domain()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.subdomain IS NOT NULL AND NEW.subdomain != '' THEN
        NEW.full_domain = NEW.subdomain || '.' || NEW.domain;
    ELSE
        NEW.full_domain = NEW.domain;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set full_domain before insert/update
CREATE TRIGGER set_full_domain_trigger
    BEFORE INSERT OR UPDATE ON custom_domains
    FOR EACH ROW
    EXECUTE FUNCTION set_full_domain();

-- Function to generate verification token
CREATE OR REPLACE FUNCTION generate_verification_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.verification_token IS NULL OR NEW.verification_token = '' THEN
        NEW.verification_token = 'verify-' || encode(gen_random_bytes(32), 'hex');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate verification token
CREATE TRIGGER generate_verification_token_trigger
    BEFORE INSERT ON custom_domains
    FOR EACH ROW
    EXECUTE FUNCTION generate_verification_token();

-- Add comment documentation
COMMENT ON TABLE custom_domains IS 'Stores custom domain configurations for assessments';
COMMENT ON COLUMN custom_domains.verification_token IS 'Token used for domain ownership verification via DNS TXT record';
COMMENT ON COLUMN custom_domains.full_domain IS 'Complete domain including subdomain (auto-computed)';
COMMENT ON COLUMN custom_domains.dns_configured IS 'Whether DNS records are properly configured';
COMMENT ON TABLE domain_verification_records IS 'DNS records required for domain verification';
COMMENT ON TABLE domain_access_logs IS 'Logs of custom domain access for analytics and monitoring';
