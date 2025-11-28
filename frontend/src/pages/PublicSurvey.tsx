import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { CheckCircle, Loader } from 'lucide-react';

export default function PublicSurvey() {
  const { slug } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { register, handleSubmit, formState: { errors } } = useForm();

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['public-assessment', slug],
    queryFn: async () => {
      const response = await api.getPublicAssessment(slug!);
      return response.data.assessment;
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => api.submitResponse(slug!, data),
    onSuccess: (response) => {
      setResult(response.data.response);
      setSubmitted(true);
      toast.success('Assessment submitted successfully!');
    },
    onError: () => toast.error('Failed to submit assessment'),
  });

  const onSubmit = async (formData: any) => {
    const answerArray = Object.entries(answers).map(([questionId, answerId]) => ({
      question_id: questionId,
      answer_option_id: answerId,
    }));

    await submitMutation.mutateAsync({
      respondent: formData,
      answers: answerArray,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-primary-600" size={48} />
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full card text-center">
          <CheckCircle className="mx-auto text-green-600 mb-4" size={64} />
          <h1 className="text-3xl font-bold mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            Your assessment has been submitted successfully.
          </p>

          <div className="bg-primary-50 rounded-lg p-6 mb-6">
            <p className="text-lg font-semibold mb-2">Your Score</p>
            <p className="text-4xl font-bold text-primary-600">{result.total_score}</p>
            {result.score_range && (
              <>
                <p className="text-xl font-semibold mt-4">{result.score_range.range_name}</p>
                {result.score_range.description && (
                  <p className="text-gray-600 mt-2">{result.score_range.description}</p>
                )}
              </>
            )}
          </div>

          <p className="text-sm text-gray-600">
            A detailed PDF report has been sent to your email address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="card mb-6">
          <h1 className="text-3xl font-bold mb-2">{assessment?.title}</h1>
          {assessment?.description && (
            <p className="text-gray-600">{assessment.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input type="text" className="input" {...register('name')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  className="input"
                  {...register('email', { required: true })}
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">Email is required</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <input type="text" className="input" {...register('company')} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="tel" className="input" {...register('phone')} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {assessment?.questions?.map((question: any, idx: number) => (
              <div key={question.id} className="card">
                <h3 className="font-semibold mb-3">
                  {idx + 1}. {question.question_text}
                  {question.required && <span className="text-red-600 ml-1">*</span>}
                </h3>

                <div className="space-y-2">
                  {question.answer_options?.map((option: any) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.id}
                        onChange={() => {
                          setAnswers({ ...answers, [question.id]: option.id });
                        }}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span>{option.option_text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="btn-primary w-full text-lg py-3"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
          </button>
        </form>
      </div>
    </div>
  );
}
