import pool from '../config/database';

export interface GHLIntegration {
  id: string;
  user_id: string;
  location_id: string;
  api_key: string;
  is_active: boolean;
  webhook_url?: string;
  webhook_secret?: string;
  last_sync_at?: Date;
  sync_enabled: boolean;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export interface GHLFieldMapping {
  id: string;
  integration_id: string;
  assessment_id?: string;
  source_field: string;
  ghl_field_key: string;
  ghl_field_type?: string;
  transform_function?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GHLSyncLog {
  id: string;
  integration_id: string;
  response_id: string;
  ghl_contact_id?: string;
  sync_type: string;
  sync_status: 'pending' | 'success' | 'failed' | 'retrying';
  request_payload?: any;
  response_payload?: any;
  error_message?: string;
  retry_count: number;
  synced_at?: Date;
  created_at: Date;
}

export class GHLIntegrationModel {
  static async create(data: {
    user_id: string;
    location_id: string;
    api_key: string;
    webhook_secret?: string;
  }): Promise<GHLIntegration> {
    const query = `
      INSERT INTO ghl_integrations (user_id, location_id, api_key, webhook_secret)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.user_id,
      data.location_id,
      data.api_key,
      data.webhook_secret
    ]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<GHLIntegration | null> {
    const query = 'SELECT * FROM ghl_integrations WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<GHLIntegration[]> {
    const query = 'SELECT * FROM ghl_integrations WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findActiveByUserId(userId: string): Promise<GHLIntegration | null> {
    const query = `
      SELECT * FROM ghl_integrations
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  static async update(id: string, updates: Partial<GHLIntegration>): Promise<GHLIntegration | null> {
    const allowedFields = [
      'location_id', 'api_key', 'is_active', 'webhook_url',
      'webhook_secret', 'last_sync_at', 'sync_enabled', 'metadata'
    ];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    const values = fields.map(key => updates[key as keyof GHLIntegration]);

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => {
      if (field === 'metadata') {
        return `${field} = $${index + 2}::jsonb`;
      }
      return `${field} = $${index + 2}`;
    }).join(', ');

    const query = `UPDATE ghl_integrations SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM ghl_integrations WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Field Mappings
  static async createFieldMapping(data: {
    integration_id: string;
    assessment_id?: string;
    source_field: string;
    ghl_field_key: string;
    ghl_field_type?: string;
    transform_function?: string;
  }): Promise<GHLFieldMapping> {
    const query = `
      INSERT INTO ghl_field_mappings (
        integration_id, assessment_id, source_field, ghl_field_key,
        ghl_field_type, transform_function
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.integration_id,
      data.assessment_id,
      data.source_field,
      data.ghl_field_key,
      data.ghl_field_type,
      data.transform_function
    ]);
    return result.rows[0];
  }

  static async getFieldMappings(integrationId: string, assessmentId?: string): Promise<GHLFieldMapping[]> {
    let query = `
      SELECT * FROM ghl_field_mappings
      WHERE integration_id = $1
    `;
    const params: any[] = [integrationId];

    if (assessmentId) {
      query += ' AND (assessment_id = $2 OR assessment_id IS NULL)';
      params.push(assessmentId);
    }

    query += ' ORDER BY created_at';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async deleteFieldMapping(id: string): Promise<boolean> {
    const query = 'DELETE FROM ghl_field_mappings WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Sync Logs
  static async createSyncLog(data: {
    integration_id: string;
    response_id: string;
    sync_type: string;
    request_payload?: any;
  }): Promise<GHLSyncLog> {
    const query = `
      INSERT INTO ghl_sync_log (integration_id, response_id, sync_type, request_payload)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.integration_id,
      data.response_id,
      data.sync_type,
      JSON.stringify(data.request_payload || {})
    ]);
    return result.rows[0];
  }

  static async updateSyncLog(
    id: string,
    updates: {
      sync_status: string;
      ghl_contact_id?: string;
      response_payload?: any;
      error_message?: string;
      synced_at?: Date;
    }
  ): Promise<GHLSyncLog | null> {
    const query = `
      UPDATE ghl_sync_log
      SET sync_status = $2,
          ghl_contact_id = $3,
          response_payload = $4,
          error_message = $5,
          synced_at = $6
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [
      id,
      updates.sync_status,
      updates.ghl_contact_id,
      JSON.stringify(updates.response_payload || {}),
      updates.error_message,
      updates.synced_at || new Date()
    ]);
    return result.rows[0] || null;
  }

  static async incrementRetryCount(id: string): Promise<void> {
    const query = `
      UPDATE ghl_sync_log
      SET retry_count = retry_count + 1
      WHERE id = $1
    `;
    await pool.query(query, [id]);
  }

  static async getPendingSyncs(limit = 50): Promise<GHLSyncLog[]> {
    const query = `
      SELECT * FROM ghl_sync_log
      WHERE sync_status IN ('pending', 'retrying')
        AND retry_count < 5
      ORDER BY created_at
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async getSyncLogsByResponse(responseId: string): Promise<GHLSyncLog[]> {
    const query = `
      SELECT * FROM ghl_sync_log
      WHERE response_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [responseId]);
    return result.rows;
  }

  // Workflow Triggers
  static async createWorkflowTrigger(data: {
    integration_id: string;
    assessment_id?: string;
    score_range_id?: string;
    ghl_workflow_id: string;
    trigger_type?: string;
    trigger_condition?: any;
  }): Promise<any> {
    const query = `
      INSERT INTO ghl_workflow_triggers (
        integration_id, assessment_id, score_range_id, ghl_workflow_id,
        trigger_type, trigger_condition
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.integration_id,
      data.assessment_id,
      data.score_range_id,
      data.ghl_workflow_id,
      data.trigger_type || 'score_range',
      JSON.stringify(data.trigger_condition || {})
    ]);
    return result.rows[0];
  }

  static async getWorkflowTriggers(integrationId: string, assessmentId?: string): Promise<any[]> {
    let query = `
      SELECT * FROM ghl_workflow_triggers
      WHERE integration_id = $1 AND is_active = true
    `;
    const params: any[] = [integrationId];

    if (assessmentId) {
      query += ' AND assessment_id = $2';
      params.push(assessmentId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Tag Rules
  static async createTagRule(data: {
    integration_id: string;
    assessment_id?: string;
    score_range_id?: string;
    tag_name: string;
    apply_on?: string;
  }): Promise<any> {
    const query = `
      INSERT INTO ghl_tag_rules (
        integration_id, assessment_id, score_range_id, tag_name, apply_on
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.integration_id,
      data.assessment_id,
      data.score_range_id,
      data.tag_name,
      data.apply_on || 'completion'
    ]);
    return result.rows[0];
  }

  static async getTagRules(integrationId: string, assessmentId?: string): Promise<any[]> {
    let query = `
      SELECT * FROM ghl_tag_rules
      WHERE integration_id = $1 AND is_active = true
    `;
    const params: any[] = [integrationId];

    if (assessmentId) {
      query += ' AND assessment_id = $2';
      params.push(assessmentId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }
}
