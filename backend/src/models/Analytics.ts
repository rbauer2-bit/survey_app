import pool from '../config/database';

export interface AnswerAggregation {
  assessment_id: string;
  user_id: string;
  question_id: string;
  question_text: string;
  question_order: number;
  answer_option_id: string;
  answer_text: string;
  points: number;
  response_count: number;
  avg_points: number;
}

export interface AssessmentStatistics {
  assessment_id: string;
  user_id: string;
  title: string;
  total_responses: number;
  completed_responses: number;
  avg_score: number;
  min_score: number;
  max_score: number;
  first_response_date: Date;
  last_response_date: Date;
}

export interface AnalyticsSnapshot {
  id: string;
  assessment_id: string;
  user_id: string;
  total_responses: number;
  date_range_start?: Date;
  date_range_end?: Date;
  question_stats: any;
  ai_insights?: string;
  ai_generated_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface QuestionStats {
  question_id: string;
  question_text: string;
  question_order: number;
  total_responses: number;
  answer_distribution: {
    answer_option_id: string;
    answer_text: string;
    points: number;
    count: number;
    percentage: number;
  }[];
}

export class AnalyticsModel {
  // Get answer aggregations for a specific assessment
  static async getAnswerAggregations(assessmentId: string): Promise<AnswerAggregation[]> {
    // Refresh materialized view first
    await pool.query('SELECT refresh_answer_aggregations()');

    const query = `
      SELECT * FROM answer_aggregations
      WHERE assessment_id = $1
      ORDER BY question_order, points DESC
    `;

    const result = await pool.query(query, [assessmentId]);
    return result.rows;
  }

  // Get overall statistics for an assessment
  static async getAssessmentStatistics(assessmentId: string): Promise<AssessmentStatistics | null> {
    const query = `
      SELECT * FROM assessment_statistics
      WHERE assessment_id = $1
    `;

    const result = await pool.query(query, [assessmentId]);
    return result.rows[0] || null;
  }

  // Get all assessments statistics for a user (client)
  static async getUserAssessmentStatistics(userId: string): Promise<AssessmentStatistics[]> {
    const query = `
      SELECT * FROM assessment_statistics
      WHERE user_id = $1
      ORDER BY last_response_date DESC NULLS LAST
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Get formatted question statistics for AI analysis
  static async getQuestionStats(assessmentId: string): Promise<QuestionStats[]> {
    const aggregations = await this.getAnswerAggregations(assessmentId);

    // Group by question
    const questionMap = new Map<string, QuestionStats>();

    aggregations.forEach((agg) => {
      if (!questionMap.has(agg.question_id)) {
        questionMap.set(agg.question_id, {
          question_id: agg.question_id,
          question_text: agg.question_text,
          question_order: agg.question_order,
          total_responses: 0,
          answer_distribution: [],
        });
      }

      const question = questionMap.get(agg.question_id)!;
      question.total_responses += agg.response_count;
      question.answer_distribution.push({
        answer_option_id: agg.answer_option_id,
        answer_text: agg.answer_text,
        points: agg.points,
        count: agg.response_count,
        percentage: 0, // Will calculate after
      });
    });

    // Calculate percentages
    const questionStats = Array.from(questionMap.values());
    questionStats.forEach((q) => {
      q.answer_distribution.forEach((answer) => {
        answer.percentage = q.total_responses > 0
          ? Math.round((answer.count / q.total_responses) * 100 * 10) / 10
          : 0;
      });
    });

    return questionStats.sort((a, b) => a.question_order - b.question_order);
  }

  // Create or update analytics snapshot
  static async createSnapshot(
    assessmentId: string,
    userId: string,
    questionStats: QuestionStats[],
    totalResponses: number,
    aiInsights?: string
  ): Promise<AnalyticsSnapshot> {
    const query = `
      INSERT INTO analytics_snapshots (
        assessment_id, user_id, total_responses, question_stats, ai_insights, ai_generated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      assessmentId,
      userId,
      totalResponses,
      JSON.stringify(questionStats),
      aiInsights,
      aiInsights ? new Date() : null,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get latest snapshot for an assessment
  static async getLatestSnapshot(assessmentId: string): Promise<AnalyticsSnapshot | null> {
    const query = `
      SELECT * FROM analytics_snapshots
      WHERE assessment_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [assessmentId]);
    return result.rows[0] || null;
  }

  // Update AI insights for existing snapshot
  static async updateSnapshotInsights(snapshotId: string, aiInsights: string): Promise<void> {
    const query = `
      UPDATE analytics_snapshots
      SET ai_insights = $1, ai_generated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await pool.query(query, [aiInsights, snapshotId]);
  }

  // Get score distribution for an assessment
  static async getScoreDistribution(assessmentId: string): Promise<{
    score_range_id: string;
    range_title: string;
    min_score: number;
    max_score: number;
    count: number;
    percentage: number;
  }[]> {
    const query = `
      SELECT
        sr.id as score_range_id,
        sr.title as range_title,
        sr.min_score,
        sr.max_score,
        COUNT(r.id) as count
      FROM score_ranges sr
      LEFT JOIN responses r ON
        r.assessment_id = sr.assessment_id AND
        r.total_score >= sr.min_score AND
        r.total_score <= sr.max_score AND
        r.completed_at IS NOT NULL
      WHERE sr.assessment_id = $1
      GROUP BY sr.id, sr.title, sr.min_score, sr.max_score
      ORDER BY sr.min_score
    `;

    const result = await pool.query(query, [assessmentId]);

    // Calculate total and percentages
    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count), 0);

    return result.rows.map(row => ({
      score_range_id: row.score_range_id,
      range_title: row.range_title,
      min_score: row.min_score,
      max_score: row.max_score,
      count: parseInt(row.count),
      percentage: total > 0 ? Math.round((parseInt(row.count) / total) * 100 * 10) / 10 : 0,
    }));
  }

  // Get response trends over time
  static async getResponseTrends(
    assessmentId: string,
    interval: 'day' | 'week' | 'month' = 'day',
    limit: number = 30
  ): Promise<{ date: string; count: number; avg_score: number }[]> {
    const dateFormat = {
      day: 'YYYY-MM-DD',
      week: 'IYYY-IW',
      month: 'YYYY-MM',
    }[interval];

    const query = `
      SELECT
        TO_CHAR(created_at, $2) as date,
        COUNT(*) as count,
        ROUND(AVG(total_score), 2) as avg_score
      FROM responses
      WHERE assessment_id = $1 AND completed_at IS NOT NULL
      GROUP BY TO_CHAR(created_at, $2)
      ORDER BY date DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [assessmentId, dateFormat, limit]);
    return result.rows.reverse();
  }
}
