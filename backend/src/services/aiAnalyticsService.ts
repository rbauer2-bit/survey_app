import OpenAI from 'openai';
import { AnalyticsModel, QuestionStats, AssessmentStatistics } from '../models/Analytics';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalyticsInsightRequest {
  assessmentTitle: string;
  assessmentDescription?: string;
  industry?: string;
  targetAvatar?: string;
  statistics: AssessmentStatistics;
  questionStats: QuestionStats[];
  scoreDistribution?: {
    range_title: string;
    count: number;
    percentage: number;
  }[];
}

export class AIAnalyticsService {
  /**
   * Generate comprehensive analytical narrative using GPT-4
   */
  static async generateInsights(data: AnalyticsInsightRequest): Promise<string> {
    const prompt = this.buildAnalyticsPrompt(data);

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert data analyst and market research specialist. Your role is to analyze survey/assessment data and provide actionable insights that position the survey creator as an authority in their niche.

Your analysis should:
- Identify key patterns and trends in the data
- Highlight significant findings and anomalies
- Provide strategic recommendations
- Use data-driven language with specific percentages and numbers
- Be professional yet accessible
- Help the client create compelling content (reports, webinars, videos)
- Position insights around industry best practices

Format your response in markdown with clear sections.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      return completion.choices[0].message.content || 'No insights generated.';
    } catch (error) {
      console.error('Error generating AI insights:', error);
      throw new Error('Failed to generate AI insights');
    }
  }

  /**
   * Generate a quick summary for dashboard overview
   */
  static async generateQuickSummary(data: AnalyticsInsightRequest): Promise<string> {
    const prompt = `Provide a brief 2-3 sentence executive summary of this assessment data:

Assessment: ${data.assessmentTitle}
Total Responses: ${data.statistics.total_responses}
Completion Rate: ${Math.round((data.statistics.completed_responses / data.statistics.total_responses) * 100)}%
Average Score: ${data.statistics.avg_score}

Key question with highest engagement: ${data.questionStats[0]?.question_text}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a data analyst. Provide concise, professional summaries.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 150,
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Summary generation failed.';
    }
  }

  /**
   * Generate content suggestions for reports/webinars
   */
  static async generateContentSuggestions(data: AnalyticsInsightRequest): Promise<{
    reportTopics: string[];
    webinarIdeas: string[];
    videoScripts: string[];
  }> {
    const prompt = `Based on this assessment data, suggest 3 compelling topics for each content type:

Assessment: ${data.assessmentTitle}
Industry: ${data.industry || 'General'}
Target Audience: ${data.targetAvatar || 'General audience'}

Key Findings:
${data.questionStats.slice(0, 3).map((q, i) => {
  const topAnswer = q.answer_distribution.sort((a, b) => b.count - a.count)[0];
  return `${i + 1}. ${q.question_text}\n   Most common answer: ${topAnswer?.answer_text} (${topAnswer?.percentage}%)`;
}).join('\n')}

Provide:
1. Three report topics
2. Three webinar ideas
3. Three video script concepts

Format as JSON: {"reportTopics": [], "webinarIdeas": [], "videoScripts": []}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a content strategist. Generate compelling, data-driven content ideas. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content || '{}';
      return JSON.parse(content);
    } catch (error) {
      console.error('Error generating content suggestions:', error);
      return {
        reportTopics: [],
        webinarIdeas: [],
        videoScripts: [],
      };
    }
  }

  /**
   * Build comprehensive analytics prompt
   */
  private static buildAnalyticsPrompt(data: AnalyticsInsightRequest): string {
    const completionRate = data.statistics.total_responses > 0
      ? Math.round((data.statistics.completed_responses / data.statistics.total_responses) * 100)
      : 0;

    let prompt = `Analyze the following assessment/survey data and provide comprehensive insights:

## Assessment Overview
- **Title**: ${data.assessmentTitle}
${data.assessmentDescription ? `- **Description**: ${data.assessmentDescription}` : ''}
${data.industry ? `- **Industry**: ${data.industry}` : ''}
${data.targetAvatar ? `- **Target Audience**: ${data.targetAvatar}` : ''}

## Overall Statistics
- **Total Responses**: ${data.statistics.total_responses}
- **Completed Responses**: ${data.statistics.completed_responses} (${completionRate}% completion rate)
- **Average Score**: ${data.statistics.avg_score}
- **Score Range**: ${data.statistics.min_score} - ${data.statistics.max_score}
- **Date Range**: ${new Date(data.statistics.first_response_date).toLocaleDateString()} to ${new Date(data.statistics.last_response_date).toLocaleDateString()}

`;

    // Add score distribution if available
    if (data.scoreDistribution && data.scoreDistribution.length > 0) {
      prompt += `## Score Distribution\n`;
      data.scoreDistribution.forEach(dist => {
        prompt += `- **${dist.range_title}**: ${dist.count} responses (${dist.percentage}%)\n`;
      });
      prompt += '\n';
    }

    // Add question-by-question analysis
    prompt += `## Question Analysis\n\n`;
    data.questionStats.forEach((q, index) => {
      prompt += `### Question ${index + 1}: ${q.question_text}\n`;
      prompt += `**Total Responses**: ${q.total_responses}\n\n`;
      prompt += `**Answer Distribution**:\n`;

      // Sort answers by count descending
      const sortedAnswers = [...q.answer_distribution].sort((a, b) => b.count - a.count);
      sortedAnswers.forEach(answer => {
        prompt += `- ${answer.answer_text}: ${answer.count} (${answer.percentage}%) - ${answer.points} points\n`;
      });
      prompt += '\n';
    });

    prompt += `\n## Required Insights

Please provide:

1. **Key Findings**: 3-5 most significant patterns or trends
2. **Audience Insights**: What this data reveals about the target audience
3. **Behavioral Patterns**: Notable answer patterns and what they suggest
4. **Opportunities**: Strategic recommendations based on the data
5. **Authority Positioning**: How the client can use these insights to establish expertise

Be specific, use percentages, and make it actionable for creating authoritative content.`;

    return prompt;
  }

  /**
   * Analyze trends and generate predictive insights
   */
  static async generateTrendAnalysis(
    assessmentId: string,
    historicalData: {
      date: string;
      count: number;
      avg_score: number;
    }[]
  ): Promise<string> {
    if (historicalData.length < 3) {
      return 'Insufficient data for trend analysis. Collect more responses over time.';
    }

    const prompt = `Analyze these response trends over time and provide insights:

${historicalData.map(d => `${d.date}: ${d.count} responses, avg score ${d.avg_score}`).join('\n')}

Identify:
1. Growth trends
2. Score trends
3. Patterns or seasonality
4. Recommendations for optimization`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a data analyst specializing in trend analysis.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 800,
      });

      return completion.choices[0].message.content || 'No trend analysis available.';
    } catch (error) {
      console.error('Error generating trend analysis:', error);
      return 'Failed to generate trend analysis.';
    }
  }
}
