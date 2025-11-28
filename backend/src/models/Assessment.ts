import pool from '../config/database';
import { Assessment, AssessmentWithDetails, Question, AnswerOption, ScoreRange } from '../types';

export class AssessmentModel {
  static async create(data: {
    user_id: string;
    title: string;
    description?: string;
    industry?: string;
    target_avatar?: string;
    slug: string;
    branding_config?: any;
  }): Promise<Assessment> {
    const query = `
      INSERT INTO assessments (user_id, title, description, industry, target_avatar, slug, branding_config)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.user_id,
      data.title,
      data.description,
      data.industry,
      data.target_avatar,
      data.slug,
      JSON.stringify(data.branding_config || {})
    ]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Assessment | null> {
    const query = 'SELECT * FROM assessments WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findBySlug(slug: string): Promise<Assessment | null> {
    const query = 'SELECT * FROM assessments WHERE slug = $1';
    const result = await pool.query(query, [slug]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<Assessment[]> {
    const query = 'SELECT * FROM assessments WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findWithDetails(id: string): Promise<AssessmentWithDetails | null> {
    const assessment = await this.findById(id);
    if (!assessment) return null;

    const questionsQuery = `
      SELECT q.*,
        json_agg(
          json_build_object(
            'id', ao.id,
            'question_id', ao.question_id,
            'option_text', ao.option_text,
            'point_value', ao.point_value,
            'order_index', ao.order_index,
            'created_at', ao.created_at
          ) ORDER BY ao.order_index
        ) as answer_options
      FROM questions q
      LEFT JOIN answer_options ao ON ao.question_id = q.id
      WHERE q.assessment_id = $1
      GROUP BY q.id
      ORDER BY q.order_index
    `;

    const scoreRangesQuery = `
      SELECT * FROM score_ranges WHERE assessment_id = $1 ORDER BY min_score
    `;

    const [questionsResult, scoreRangesResult] = await Promise.all([
      pool.query(questionsQuery, [id]),
      pool.query(scoreRangesQuery, [id])
    ]);

    return {
      ...assessment,
      questions: questionsResult.rows,
      score_ranges: scoreRangesResult.rows
    };
  }

  static async update(id: string, updates: Partial<Assessment>): Promise<Assessment | null> {
    const allowedFields = ['title', 'description', 'industry', 'target_avatar', 'status', 'branding_config'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    const values = fields.map(key => updates[key as keyof Assessment]);

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => {
      if (field === 'branding_config') {
        return `${field} = $${index + 2}::jsonb`;
      }
      return `${field} = $${index + 2}`;
    }).join(', ');

    const query = `UPDATE assessments SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM assessments WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async publish(id: string): Promise<Assessment | null> {
    const query = `UPDATE assessments SET status = 'published' WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async archive(id: string): Promise<Assessment | null> {
    const query = `UPDATE assessments SET status = 'archived' WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getStats(assessmentId: string): Promise<{
    total_responses: number;
    avg_score: number;
    completion_rate: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_responses,
        COALESCE(AVG(total_score), 0) as avg_score
      FROM responses
      WHERE assessment_id = $1
    `;
    const result = await pool.query(query, [assessmentId]);
    return {
      total_responses: parseInt(result.rows[0].total_responses),
      avg_score: parseFloat(result.rows[0].avg_score),
      completion_rate: 100 // Can be enhanced with partial response tracking
    };
  }
}
