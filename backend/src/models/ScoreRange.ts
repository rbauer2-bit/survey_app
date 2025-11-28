import pool from '../config/database';
import { ScoreRange } from '../types';

export class ScoreRangeModel {
  static async create(data: {
    assessment_id: string;
    range_name: string;
    min_score: number;
    max_score: number;
    description?: string;
    recommendations?: string;
    pdf_template_config?: any;
  }): Promise<ScoreRange> {
    const query = `
      INSERT INTO score_ranges (
        assessment_id, range_name, min_score, max_score,
        description, recommendations, pdf_template_config
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.assessment_id,
      data.range_name,
      data.min_score,
      data.max_score,
      data.description,
      data.recommendations,
      JSON.stringify(data.pdf_template_config || {})
    ]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<ScoreRange | null> {
    const query = 'SELECT * FROM score_ranges WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByAssessmentId(assessmentId: string): Promise<ScoreRange[]> {
    const query = `
      SELECT * FROM score_ranges
      WHERE assessment_id = $1
      ORDER BY min_score
    `;
    const result = await pool.query(query, [assessmentId]);
    return result.rows;
  }

  static async findByScore(assessmentId: string, score: number): Promise<ScoreRange | null> {
    const query = `
      SELECT * FROM score_ranges
      WHERE assessment_id = $1
        AND min_score <= $2
        AND max_score >= $2
      LIMIT 1
    `;
    const result = await pool.query(query, [assessmentId, score]);
    return result.rows[0] || null;
  }

  static async update(id: string, updates: Partial<ScoreRange>): Promise<ScoreRange | null> {
    const allowedFields = [
      'range_name', 'min_score', 'max_score',
      'description', 'recommendations', 'pdf_template_config'
    ];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    const values = fields.map(key => updates[key as keyof ScoreRange]);

    if (fields.length === 0) return null;

    const setClause = fields.map((field, index) => {
      if (field === 'pdf_template_config') {
        return `${field} = $${index + 2}::jsonb`;
      }
      return `${field} = $${index + 2}`;
    }).join(', ');

    const query = `UPDATE score_ranges SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM score_ranges WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  static async validateRanges(assessmentId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const ranges = await this.findByAssessmentId(assessmentId);

    const errors: string[] = [];

    // Check for overlapping ranges
    for (let i = 0; i < ranges.length; i++) {
      for (let j = i + 1; j < ranges.length; j++) {
        const range1 = ranges[i];
        const range2 = ranges[j];

        if (
          (range1.min_score <= range2.max_score && range1.max_score >= range2.min_score) ||
          (range2.min_score <= range1.max_score && range2.max_score >= range1.min_score)
        ) {
          errors.push(
            `Ranges "${range1.range_name}" and "${range2.range_name}" overlap`
          );
        }
      }
    }

    // Check for gaps
    const sorted = [...ranges].sort((a, b) => a.min_score - b.min_score);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].max_score + 1 < sorted[i + 1].min_score) {
        errors.push(
          `Gap between "${sorted[i].range_name}" and "${sorted[i + 1].range_name}"`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
