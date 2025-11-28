import pool from '../config/database';
import { EmailSequence, EmailTemplate, EmailDelivery } from '../types';

export class EmailModel {
  static async createSequence(data: {
    assessment_id: string;
    name: string;
    trigger_type: 'immediate' | 'score_based' | 'time_delayed';
    score_range_id?: string;
    active?: boolean;
  }): Promise<EmailSequence> {
    const query = `
      INSERT INTO email_sequences (assessment_id, name, trigger_type, score_range_id, active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.assessment_id,
      data.name,
      data.trigger_type,
      data.score_range_id,
      data.active ?? true
    ]);
    return result.rows[0];
  }

  static async findSequenceById(id: string): Promise<EmailSequence | null> {
    const query = 'SELECT * FROM email_sequences WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findSequencesByAssessmentId(assessmentId: string): Promise<EmailSequence[]> {
    const query = `
      SELECT * FROM email_sequences
      WHERE assessment_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [assessmentId]);
    return result.rows;
  }

  static async updateSequence(id: string, updates: Partial<EmailSequence>): Promise<EmailSequence | null> {
    const allowedFields = ['name', 'trigger_type', 'score_range_id', 'active'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    const values = fields.map(key => updates[key as keyof EmailSequence]);

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE email_sequences SET ${setClause} WHERE id = $1 RETURNING *`;

    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async deleteSequence(id: string): Promise<boolean> {
    const query = 'DELETE FROM email_sequences WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async createTemplate(data: {
    sequence_id: string;
    subject: string;
    body_html: string;
    body_text: string;
    delay_days: number;
    order_index: number;
    active?: boolean;
  }): Promise<EmailTemplate> {
    const query = `
      INSERT INTO email_templates (
        sequence_id, subject, body_html, body_text, delay_days, order_index, active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.sequence_id,
      data.subject,
      data.body_html,
      data.body_text,
      data.delay_days,
      data.order_index,
      data.active ?? true
    ]);
    return result.rows[0];
  }

  static async findTemplateById(id: string): Promise<EmailTemplate | null> {
    const query = 'SELECT * FROM email_templates WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findTemplatesBySequenceId(sequenceId: string): Promise<EmailTemplate[]> {
    const query = `
      SELECT * FROM email_templates
      WHERE sequence_id = $1
      ORDER BY order_index
    `;
    const result = await pool.query(query, [sequenceId]);
    return result.rows;
  }

  static async updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    const allowedFields = ['subject', 'body_html', 'body_text', 'delay_days', 'order_index', 'active'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    const values = fields.map(key => updates[key as keyof EmailTemplate]);

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE email_templates SET ${setClause} WHERE id = $1 RETURNING *`;

    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async deleteTemplate(id: string): Promise<boolean> {
    const query = 'DELETE FROM email_templates WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async scheduleEmail(data: {
    response_id: string;
    email_template_id: string;
    scheduled_for: Date;
  }): Promise<EmailDelivery> {
    const query = `
      INSERT INTO email_deliveries (response_id, email_template_id, scheduled_for, status)
      VALUES ($1, $2, $3, 'scheduled')
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.response_id,
      data.email_template_id,
      data.scheduled_for
    ]);
    return result.rows[0];
  }

  static async updateDeliveryStatus(
    id: string,
    status: 'sent' | 'delivered' | 'failed' | 'bounced',
    errorMessage?: string
  ): Promise<EmailDelivery | null> {
    const timestamp = new Date();
    const query = `
      UPDATE email_deliveries
      SET status = $2,
          ${status === 'sent' ? 'sent_at = $3,' : ''}
          ${status === 'delivered' ? 'delivered_at = $3,' : ''}
          error_message = $4
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id, status, timestamp, errorMessage]);
    return result.rows[0] || null;
  }

  static async markEmailOpened(id: string): Promise<EmailDelivery | null> {
    const query = `
      UPDATE email_deliveries
      SET opened_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND opened_at IS NULL
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async markEmailClicked(id: string): Promise<EmailDelivery | null> {
    const query = `
      UPDATE email_deliveries
      SET clicked_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND clicked_at IS NULL
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getPendingEmails(): Promise<EmailDelivery[]> {
    const query = `
      SELECT ed.*, et.*, r.respondent_id
      FROM email_deliveries ed
      JOIN email_templates et ON et.id = ed.email_template_id
      JOIN responses r ON r.id = ed.response_id
      WHERE ed.status = 'scheduled'
        AND ed.scheduled_for <= CURRENT_TIMESTAMP
      ORDER BY ed.scheduled_for
      LIMIT 100
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getSequenceForResponse(responseId: string): Promise<{
    sequences: EmailSequence[];
    templates: EmailTemplate[];
  }> {
    const query = `
      SELECT
        es.*,
        json_agg(
          json_build_object(
            'id', et.id,
            'sequence_id', et.sequence_id,
            'subject', et.subject,
            'body_html', et.body_html,
            'body_text', et.body_text,
            'delay_days', et.delay_days,
            'order_index', et.order_index,
            'active', et.active
          ) ORDER BY et.order_index
        ) as templates
      FROM responses r
      JOIN assessments a ON a.id = r.assessment_id
      JOIN email_sequences es ON es.assessment_id = a.id
      LEFT JOIN email_templates et ON et.sequence_id = es.id
      WHERE r.id = $1
        AND es.active = true
        AND (
          es.trigger_type = 'immediate'
          OR (es.trigger_type = 'score_based' AND es.score_range_id = r.score_range_id)
        )
      GROUP BY es.id
    `;
    const result = await pool.query(query, [responseId]);
    return {
      sequences: result.rows,
      templates: result.rows.flatMap(row => row.templates || [])
    };
  }
}
