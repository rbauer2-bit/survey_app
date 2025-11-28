import pool from '../config/database';
import { Response, ResponseWithDetails, Respondent, ResponseAnswer } from '../types';

export class ResponseModel {
  static async createRespondent(data: {
    email: string;
    name?: string;
    phone?: string;
    company?: string;
    metadata?: any;
  }): Promise<Respondent> {
    const existing = await pool.query('SELECT * FROM respondents WHERE email = $1', [data.email]);

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const query = `
      INSERT INTO respondents (email, name, phone, company, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      data.email,
      data.name,
      data.phone,
      data.company,
      JSON.stringify(data.metadata || {})
    ]);
    return result.rows[0];
  }

  static async createResponse(data: {
    assessment_id: string;
    respondent_id: string;
    answers: Array<{ question_id: string; answer_option_id: string }>;
  }): Promise<Response> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Calculate total score
      const scoreQuery = `
        SELECT COALESCE(SUM(ao.point_value), 0) as total_score
        FROM unnest($1::uuid[]) as answer_id
        JOIN answer_options ao ON ao.id = answer_id
      `;
      const answerIds = data.answers.map(a => a.answer_option_id);
      const scoreResult = await client.query(scoreQuery, [answerIds]);
      const totalScore = parseInt(scoreResult.rows[0].total_score);

      // Find matching score range
      const rangeQuery = `
        SELECT id FROM score_ranges
        WHERE assessment_id = $1
          AND min_score <= $2
          AND max_score >= $2
        LIMIT 1
      `;
      const rangeResult = await client.query(rangeQuery, [data.assessment_id, totalScore]);
      const scoreRangeId = rangeResult.rows[0]?.id || null;

      // Create response
      const responseQuery = `
        INSERT INTO responses (assessment_id, respondent_id, total_score, score_range_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const responseResult = await client.query(responseQuery, [
        data.assessment_id,
        data.respondent_id,
        totalScore,
        scoreRangeId
      ]);
      const response = responseResult.rows[0];

      // Create response answers
      for (const answer of data.answers) {
        await client.query(
          'INSERT INTO response_answers (response_id, question_id, answer_option_id) VALUES ($1, $2, $3)',
          [response.id, answer.question_id, answer.answer_option_id]
        );
      }

      await client.query('COMMIT');
      return response;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id: string): Promise<Response | null> {
    const query = 'SELECT * FROM responses WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findWithDetails(id: string): Promise<ResponseWithDetails | null> {
    const query = `
      SELECT
        r.*,
        row_to_json(resp.*) as respondent,
        row_to_json(sr.*) as score_range
      FROM responses r
      JOIN respondents resp ON resp.id = r.respondent_id
      LEFT JOIN score_ranges sr ON sr.id = r.score_range_id
      WHERE r.id = $1
    `;

    const answersQuery = `
      SELECT
        ra.*,
        row_to_json(q.*) as question,
        row_to_json(ao.*) as answer_option
      FROM response_answers ra
      JOIN questions q ON q.id = ra.question_id
      JOIN answer_options ao ON ao.id = ra.answer_option_id
      WHERE ra.response_id = $1
      ORDER BY q.order_index
    `;

    const [responseResult, answersResult] = await Promise.all([
      pool.query(query, [id]),
      pool.query(answersQuery, [id])
    ]);

    if (responseResult.rows.length === 0) return null;

    return {
      ...responseResult.rows[0],
      answers: answersResult.rows
    };
  }

  static async findByAssessmentId(assessmentId: string, limit = 50, offset = 0): Promise<Response[]> {
    const query = `
      SELECT r.*, resp.email, resp.name
      FROM responses r
      JOIN respondents resp ON resp.id = r.respondent_id
      WHERE r.assessment_id = $1
      ORDER BY r.completed_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [assessmentId, limit, offset]);
    return result.rows;
  }

  static async updatePdfInfo(id: string, pdfUrl: string): Promise<Response | null> {
    const query = `
      UPDATE responses
      SET pdf_generated = true, pdf_url = $2
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id, pdfUrl]);
    return result.rows[0] || null;
  }

  static async markEmailSent(id: string): Promise<Response | null> {
    const query = `
      UPDATE responses
      SET email_sent = true
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async getScoreDistribution(assessmentId: string): Promise<Array<{
    range_name: string;
    count: number;
  }>> {
    const query = `
      SELECT
        sr.range_name,
        COUNT(r.id) as count
      FROM score_ranges sr
      LEFT JOIN responses r ON r.score_range_id = sr.id
      WHERE sr.assessment_id = $1
      GROUP BY sr.id, sr.range_name, sr.min_score
      ORDER BY sr.min_score
    `;
    const result = await pool.query(query, [assessmentId]);
    return result.rows.map(row => ({
      range_name: row.range_name,
      count: parseInt(row.count)
    }));
  }
}
