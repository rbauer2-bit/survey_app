import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import {
  FileText,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  BarChart3
} from 'lucide-react';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: async () => {
      const response = await api.getAssessments();
      return response.data.assessments;
    },
  });

  const stats = {
    totalAssessments: assessments?.length || 0,
    publishedAssessments:
      assessments?.filter((a: any) => a.status === 'published').length || 0,
    draftAssessments:
      assessments?.filter((a: any) => a.status === 'draft').length || 0,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's an overview of your assessment performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Assessments</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalAssessments}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <FileText className="text-primary-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Published</p>
              <p className="text-3xl font-bold text-green-600">{stats.publishedAssessments}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Drafts</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.draftAssessments}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FileText className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link to="/assessments/new" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Create New Assessment
              </h3>
              <p className="text-gray-600 text-sm">
                Build a new scoreable survey for your clients
              </p>
            </div>
            <Plus
              className="text-primary-600 group-hover:scale-110 transition-transform"
              size={32}
            />
          </div>
        </Link>

        <Link to="/assessments" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                View All Assessments
              </h3>
              <p className="text-gray-600 text-sm">
                Manage and analyze your existing assessments
              </p>
            </div>
            <ArrowRight
              className="text-primary-600 group-hover:translate-x-1 transition-transform"
              size={32}
            />
          </div>
        </Link>
      </div>

      {/* Recent Assessments */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Assessments</h2>
          <Link
            to="/assessments"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View All
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading assessments...</p>
          </div>
        ) : assessments && assessments.length > 0 ? (
          <div className="space-y-3">
            {assessments.slice(0, 5).map((assessment: any) => (
              <Link
                key={assessment.id}
                to={`/assessments/${assessment.id}/edit`}
                className="block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{assessment.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {assessment.industry || 'No industry specified'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        assessment.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : assessment.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {assessment.status}
                    </span>
                    <ArrowRight size={20} className="text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No assessments yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first assessment to start qualifying leads
            </p>
            <Link to="/assessments/new" className="btn-primary inline-flex items-center gap-2">
              <Plus size={20} />
              Create Assessment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
