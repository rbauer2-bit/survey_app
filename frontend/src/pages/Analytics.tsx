import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Users, BarChart3, Sparkles, FileText, Video, Presentation } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Analytics() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [insights, setInsights] = useState<string | null>(null);
  const [contentSuggestions, setContentSuggestions] = useState<any>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  useEffect(() => {
    if (id) {
      loadAnalytics();
    }
  }, [id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [overviewRes, questionsRes, distRes, trendsRes, insightsRes] = await Promise.all([
        api.getAnalyticsOverview(id!),
        api.getQuestionAnalytics(id!),
        api.getScoreDistributionAnalytics(id!),
        api.getResponseTrends(id!, 'day', 30),
        api.getInsights(id!),
      ]);

      setOverview(overviewRes.data.statistics);
      setQuestions(questionsRes.data.questions);
      setScoreDistribution(distRes.data.distribution);
      setTrends(trendsRes.data.trends);
      setInsights(insightsRes.data.insights);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      setGeneratingInsights(true);
      const response = await api.generateInsights(id!);
      setInsights(response.data.insights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleGenerateContentSuggestions = async () => {
    try {
      const response = await api.generateContentSuggestions(id!);
      setContentSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Failed to generate content suggestions:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const completionRate = overview?.total_responses > 0
    ? Math.round((overview.completed_responses / overview.total_responses) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Assessment Analytics</h1>
        <p className="text-gray-600 mt-2">Comprehensive insights and data visualization</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Responses</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{overview?.total_responses || 0}</p>
            </div>
            <Users className="text-blue-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{completionRate}%</p>
            </div>
            <TrendingUp className="text-green-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Score</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{overview?.avg_score?.toFixed(1) || 0}</p>
            </div>
            <BarChart3 className="text-purple-600" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Score Range</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {overview?.min_score || 0} - {overview?.max_score || 0}
              </p>
            </div>
            <BarChart3 className="text-orange-600" size={40} />
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">AI-Powered Insights</h2>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={generatingInsights}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
          >
            {generatingInsights ? 'Generating...' : insights ? 'Regenerate Insights' : 'Generate Insights'}
          </button>
        </div>

        {insights ? (
          <div className="prose max-w-none">
            <ReactMarkdown>{insights}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-gray-600">Click "Generate Insights" to get AI-powered analysis of your assessment data.</p>
        )}
      </div>

      {/* Score Distribution */}
      {scoreDistribution.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Score Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={scoreDistribution}
                dataKey="count"
                nameKey="range_title"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.range_title}: ${entry.percentage}%`}
              >
                {scoreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {scoreDistribution.map((dist, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-sm text-gray-700">{dist.range_title}: {dist.count} ({dist.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Response Trends */}
      {trends.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Response Trends (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} name="Responses" />
              <Line type="monotone" dataKey="avg_score" stroke="#10B981" strokeWidth={2} name="Avg Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Question-by-Question Analysis */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Question Analysis</h2>
        <div className="space-y-8">
          {questions.map((q, idx) => (
            <div key={idx} className="border-b pb-6 last:border-b-0">
              <h3 className="font-semibold text-gray-900 mb-4">
                Q{q.question_order + 1}: {q.question_text}
              </h3>
              <p className="text-sm text-gray-600 mb-4">Total responses: {q.total_responses}</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={q.answer_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="answer_text" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.answer_distribution.map((answer: any, ansIdx: number) => (
                  <div key={ansIdx} className="text-sm">
                    <span className="font-medium">{answer.answer_text}:</span>{' '}
                    <span className="text-gray-600">{answer.count} ({answer.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Suggestions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Content Suggestions</h2>
          <button
            onClick={handleGenerateContentSuggestions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Generate Suggestions
          </button>
        </div>

        {contentSuggestions ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="text-blue-600" size={20} />
                <h3 className="font-semibold text-gray-900">Report Topics</h3>
              </div>
              <ul className="list-disc list-inside space-y-2">
                {contentSuggestions.reportTopics?.map((topic: string, idx: number) => (
                  <li key={idx} className="text-gray-700">{topic}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Presentation className="text-purple-600" size={20} />
                <h3 className="font-semibold text-gray-900">Webinar Ideas</h3>
              </div>
              <ul className="list-disc list-inside space-y-2">
                {contentSuggestions.webinarIdeas?.map((idea: string, idx: number) => (
                  <li key={idx} className="text-gray-700">{idea}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Video className="text-green-600" size={20} />
                <h3 className="font-semibold text-gray-900">Video Scripts</h3>
              </div>
              <ul className="list-disc list-inside space-y-2">
                {contentSuggestions.videoScripts?.map((script: string, idx: number) => (
                  <li key={idx} className="text-gray-700">{script}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Generate AI-powered content suggestions for reports, webinars, and videos.</p>
        )}
      </div>
    </div>
  );
}
