import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { FileText, Plus, Edit, BarChart, Mail } from 'lucide-react';

export default function AssessmentList() {
  const { data: assessments, isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: async () => {
      const response = await api.getAssessments();
      return response.data.assessments;
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assessments</h1>
          <p className="text-gray-600 mt-1">Manage all your assessments</p>
        </div>
        <Link to="/assessments/new" className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          New Assessment
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : assessments && assessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((assessment: any) => (
            <div key={assessment.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{assessment.title}</h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    assessment.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {assessment.status}
                </span>
              </div>

              {assessment.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {assessment.description}
                </p>
              )}

              {assessment.industry && (
                <p className="text-sm text-gray-500 mb-4">Industry: {assessment.industry}</p>
              )}

              <div className="flex gap-2">
                <Link
                  to={`/assessments/${assessment.id}/edit`}
                  className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                >
                  <Edit size={16} />
                  Edit
                </Link>
                <Link
                  to={`/assessments/${assessment.id}/analytics`}
                  className="btn-secondary flex items-center justify-center gap-2 px-3"
                >
                  <BarChart size={16} />
                </Link>
                <Link
                  to={`/assessments/${assessment.id}/emails`}
                  className="btn-secondary flex items-center justify-center gap-2 px-3"
                >
                  <Mail size={16} />
                </Link>
              </div>

              {assessment.status === 'published' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Public URL:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/survey/${assessment.slug}`}
                      readOnly
                      className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 flex-1"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/survey/${assessment.slug}`
                        );
                      }}
                      className="text-xs btn-secondary"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments yet</h3>
          <p className="text-gray-600 mb-6">Create your first assessment to get started</p>
          <Link to="/assessments/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={20} />
            Create Assessment
          </Link>
        </div>
      )}
    </div>
  );
}
