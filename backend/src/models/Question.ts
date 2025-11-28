import pool from '../config/database';
import { Question, AnswerOption, QuestionWithOptions } from '../types';

export class QuestionModel {
  static async create(data: {
    assessment_id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'single_choice';
    order_index: number;
    required?: boolean;
  }): Promise<Question> {
    const query = `
      INSERT INTO questions (assessment_id, question_text, question_type, order_index, required)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.assessment_id,
      data.question_text,
      data.question_type,
      data.order_index,
      data.required ?? true
    ]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<Question | null> {
    const query = 'SELECT * FROM questions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByAssessmentId(assessmentId: string): Promise<QuestionWithOptions[]> {
    const query = `
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
    const result = await pool.query(query, [assessmentId]);
    return result.rows;
  }

  static async update(id: string, updates: Partial<Question>): Promise<Question | null> {
    const allowedFields = ['question_text', 'question_type', 'order_index', 'required'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    const values = fields.map(key => updates[key as keyof Question]);

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE questions SET ${setClause} WHERE id = $1 RETURNING *`;

    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM questions WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async createAnswerOption(data: {
    question_id: string;
    option_text: string;
    point_value: number;
    order_index: number;
  }): Promise<AnswerOption> {
    const query = `
      INSERT INTO answer_options (question_id, option_text, point_value, order_index)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.question_id,
      data.option_text,
      data.point_value,
      data.order_index
    ]);
    return result.rows[0];
  }

  static async updateAnswerOption(id: string, updates: Partial<AnswerOption>): Promise<AnswerOption | null> {
    const allowedFields = ['option_text', 'point_value', 'order_index'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    const values = fields.map(key => updates[key as keyof AnswerOption]);

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `UPDATE answer_options SET ${setClause} WHERE id = $1 RETURNING *`;

    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async deleteAnswerOption(id: string): Promise<boolean> {
    const query = 'DELETE FROM answer_options WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
