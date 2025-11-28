import pool from '../config/database';

export interface CustomDomain {
  id: string;
  user_id: string;
  assessment_id?: string;
  domain: string;
  subdomain?: string;
  full_domain: string;
  verification_status: 'pending' | 'verified' | 'failed';
  verification_method: 'dns' | 'file' | 'auto';
  verification_token: string;
  verified_at?: Date;
  ssl_status: 'pending' | 'active' | 'failed' | 'none';
  ssl_issued_at?: Date;
  is_active: boolean;
  dns_configured: boolean;
  last_checked_at?: Date;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export interface DomainVerificationRecord {
  id: string;
  custom_domain_id: string;
  record_type: 'TXT' | 'CNAME' | 'A';
  record_name: string;
  record_value: string;
  is_verified: boolean;
  verified_at?: Date;
  created_at: Date;
}

export class CustomDomainModel {
  static async create(data: {
    user_id: string;
    assessment_id?: string;
    domain: string;
    subdomain?: string;
    verification_method?: string;
  }): Promise<CustomDomain> {
    const query = `
      INSERT INTO custom_domains (
        user_id, assessment_id, domain, subdomain, verification_method
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.user_id,
      data.assessment_id,
      data.domain,
      data.subdomain,
      data.verification_method || 'dns'
    ]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<CustomDomain | null> {
    const query = 'SELECT * FROM custom_domains WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByFullDomain(fullDomain: string): Promise<CustomDomain | null> {
    const query = 'SELECT * FROM custom_domains WHERE full_domain = $1';
    const result = await pool.query(query, [fullDomain]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<CustomDomain[]> {
    const query = `
      SELECT cd.*, a.title as assessment_title
      FROM custom_domains cd
      LEFT JOIN assessments a ON a.id = cd.assessment_id
      WHERE cd.user_id = $1
      ORDER BY cd.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByAssessmentId(assessmentId: string): Promise<CustomDomain[]> {
    const query = `
      SELECT * FROM custom_domains
      WHERE assessment_id = $1
      ORDER BY is_active DESC, created_at DESC
    `;
    const result = await pool.query(query, [assessmentId]);
    return result.rows;
  }

  static async update(id: string, updates: Partial<CustomDomain>): Promise<CustomDomain | null> {
    const allowedFields = [
      'assessment_id', 'verification_status', 'ssl_status',
      'is_active', 'dns_configured', 'verified_at', 'ssl_issued_at',
      'last_checked_at', 'metadata'
    ];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    const values = fields.map(key => updates[key as keyof CustomDomain]);

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => {
      if (field === 'metadata') {
        return `${field} = $${index + 2}::jsonb`;
      }
      return `${field} = $${index + 2}`;
    }).join(', ');

    const query = `UPDATE custom_domains SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM custom_domains WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async markAsVerified(id: string): Promise<CustomDomain | null> {
    const query = `
      UPDATE custom_domains
      SET verification_status = 'verified',
          verified_at = CURRENT_TIMESTAMP,
          last_checked_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async markAsFailed(id: string): Promise<CustomDomain | null> {
    const query = `
      UPDATE custom_domains
      SET verification_status = 'failed',
          last_checked_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async activate(id: string): Promise<CustomDomain | null> {
    const query = `
      UPDATE custom_domains
      SET is_active = true
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async deactivate(id: string): Promise<CustomDomain | null> {
    const query = `
      UPDATE custom_domains
      SET is_active = false
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Verification Records
  static async createVerificationRecord(data: {
    custom_domain_id: string;
    record_type: 'TXT' | 'CNAME' | 'A';
    record_name: string;
    record_value: string;
  }): Promise<DomainVerificationRecord> {
    const query = `
      INSERT INTO domain_verification_records (
        custom_domain_id, record_type, record_name, record_value
      )
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.custom_domain_id,
      data.record_type,
      data.record_name,
      data.record_value
    ]);
    return result.rows[0];
  }

  static async getVerificationRecords(customDomainId: string): Promise<DomainVerificationRecord[]> {
    const query = `
      SELECT * FROM domain_verification_records
      WHERE custom_domain_id = $1
      ORDER BY created_at
    `;
    const result = await pool.query(query, [customDomainId]);
    return result.rows;
  }

  static async markRecordAsVerified(recordId: string): Promise<DomainVerificationRecord | null> {
    const query = `
      UPDATE domain_verification_records
      SET is_verified = true, verified_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [recordId]);
    return result.rows[0] || null;
  }

  // Access Logging
  static async logAccess(data: {
    custom_domain_id: string;
    ip_address?: string;
    user_agent?: string;
    response_status: number;
  }): Promise<void> {
    const query = `
      INSERT INTO domain_access_logs (
        custom_domain_id, ip_address, user_agent, response_status
      )
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(query, [
      data.custom_domain_id,
      data.ip_address,
      data.user_agent,
      data.response_status
    ]);
  }

  static async getAccessStats(customDomainId: string, days: number = 30): Promise<any> {
    const query = `
      SELECT
        DATE(accessed_at) as date,
        COUNT(*) as total_visits,
        COUNT(DISTINCT ip_address) as unique_visitors
      FROM domain_access_logs
      WHERE custom_domain_id = $1
        AND accessed_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(accessed_at)
      ORDER BY date DESC
    `;
    const result = await pool.query(query, [customDomainId]);
    return result.rows;
  }

  // Check if domain is already in use
  static async isDomainTaken(fullDomain: string, excludeId?: string): Promise<boolean> {
    let query = 'SELECT COUNT(*) as count FROM custom_domains WHERE full_domain = $1';
    const params: any[] = [fullDomain];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }

  // Get pending verifications
  static async getPendingVerifications(): Promise<CustomDomain[]> {
    const query = `
      SELECT * FROM custom_domains
      WHERE verification_status = 'pending'
        AND last_checked_at < NOW() - INTERVAL '5 minutes'
      ORDER BY created_at
      LIMIT 50
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}
