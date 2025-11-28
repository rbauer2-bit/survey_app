import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Plus, Trash2, Save, Eye } from 'lucide-react';

export default function AssessmentBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [questions, setQuestions] = useState<any[]>([]);
  const [scoreRanges, setScoreRanges] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const { data: assessment } = useQuery({
    queryKey: ['assessment', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.getAssessment(id);
      setQuestions(response.data.assessment.questions || []);
      setScoreRanges(response.data.assessment.score_ranges || []);
      return response.data.assessment;
    },
    enabled: !!id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createAssessment(data),
    onSuccess: (response) => {
      toast.success('Assessment created!');
      navigate(`/assessments/${response.data.assessment.id}/edit`);
    },
    onError: () => toast.error('Failed to create assessment'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateAssessment(id!, data),
    onSuccess: () => {
      toast.success('Assessment saved!');
      queryClient.invalidateQueries({ queryKey: ['assessment', id] });
    },
  });

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        question_type: 'single_choice',
        order_index: questions.length,
        answer_options: [
          { option_text: '', point_value: 0, order_index: 0 },
          { option_text: '', point_value: 0, order_index: 1 },
        ],
      },
    ]);
  };

  const addScoreRange = () => {
    setScoreRanges([
      ...scoreRanges,
      { range_name: '', min_score: 0, max_score: 100, description: '' },
    ]);
  };

  const onSubmit = async (data: any) => {
    if (id) {
      await updateMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const saveQuestions = async () => {
    if (!id) {
      toast.error('Save assessment first');
      return;
    }

    try {
      for (const question of questions) {
        if (!question.id) {
          await api.addQuestion(id, question);
        }
      }
      toast.success('Questions saved!');
      queryClient.invalidateQueries({ queryKey: ['assessment', id] });
    } catch (error) {
      toast.error('Failed to save questions');
    }
  };

  const saveScoreRanges = async () => {
    if (!id) {
      toast.error('Save assessment first');
      return;
    }

    try {
      for (const range of scoreRanges) {
        if (!range.id) {
          await api.addScoreRange(id, range);
        }
      }
      toast.success('Score ranges saved!');
      queryClient.invalidateQueries({ queryKey: ['assessment', id] });
    } catch (error) {
      toast.error('Failed to save score ranges');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">
        {id ? 'Edit Assessment' : 'Create Assessment'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                className="input"
                defaultValue={assessment?.title}
                {...register('title', { required: true })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="input"
                rows={3}
                defaultValue={assessment?.description}
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Industry</label>
                <input
                  type="text"
                  className="input"
                  defaultValue={assessment?.industry}
                  {...register('industry')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Avatar</label>
                <input
                  type="text"
                  className="input"
                  defaultValue={assessment?.target_avatar}
                  {...register('target_avatar')}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary">
              <Save size={18} className="inline mr-2" />
              Save Assessment Info
            </button>
          </div>
        </div>
      </form>

      {id && (
        <>
          <div className="card mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Questions</h2>
              <button onClick={addQuestion} className="btn-secondary flex items-center gap-2">
                <Plus size={18} />
                Add Question
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="border border-gray-200 rounded-lg p-4">
                  <input
                    type="text"
                    className="input mb-3"
                    placeholder="Question text"
                    value={q.question_text}
                    onChange={(e) => {
                      const newQuestions = [...questions];
                      newQuestions[qIdx].question_text = e.target.value;
                      setQuestions(newQuestions);
                    }}
                  />

                  <div className="space-y-2">
                    {q.answer_options?.map((opt: any, optIdx: number) => (
                      <div key={optIdx} className="flex gap-2">
                        <input
                          type="text"
                          className="input flex-1"
                          placeholder="Answer option"
                          value={opt.option_text}
                          onChange={(e) => {
                            const newQuestions = [...questions];
                            newQuestions[qIdx].answer_options[optIdx].option_text = e.target.value;
                            setQuestions(newQuestions);
                          }}
                        />
                        <input
                          type="number"
                          className="input w-24"
                          placeholder="Points"
                          value={opt.point_value}
                          onChange={(e) => {
                            const newQuestions = [...questions];
                            newQuestions[qIdx].answer_options[optIdx].point_value = parseInt(e.target.value);
                            setQuestions(newQuestions);
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const newQuestions = [...questions];
                      newQuestions[qIdx].answer_options.push({
                        option_text: '',
                        point_value: 0,
                        order_index: newQuestions[qIdx].answer_options.length,
                      });
                      setQuestions(newQuestions);
                    }}
                    className="text-sm text-primary-600 mt-2"
                  >
                    + Add Option
                  </button>
                </div>
              ))}
            </div>

            {questions.length > 0 && (
              <button onClick={saveQuestions} className="btn-primary mt-4">
                Save Questions
              </button>
            )}
          </div>

          <div className="card mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Score Ranges</h2>
              <button onClick={addScoreRange} className="btn-secondary flex items-center gap-2">
                <Plus size={18} />
                Add Range
              </button>
            </div>

            <div className="space-y-4">
              {scoreRanges.map((range, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      className="input"
                      placeholder="Range name (e.g., Beginner)"
                      value={range.range_name}
                      onChange={(e) => {
                        const newRanges = [...scoreRanges];
                        newRanges[idx].range_name = e.target.value;
                        setScoreRanges(newRanges);
                      }}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="input"
                        placeholder="Min score"
                        value={range.min_score}
                        onChange={(e) => {
                          const newRanges = [...scoreRanges];
                          newRanges[idx].min_score = parseInt(e.target.value);
                          setScoreRanges(newRanges);
                        }}
                      />
                      <input
                        type="number"
                        className="input"
                        placeholder="Max score"
                        value={range.max_score}
                        onChange={(e) => {
                          const newRanges = [...scoreRanges];
                          newRanges[idx].max_score = parseInt(e.target.value);
                          setScoreRanges(newRanges);
                        }}
                      />
                    </div>
                  </div>
                  <textarea
                    className="input mt-2"
                    placeholder="Description and recommendations"
                    rows={2}
                    value={range.description}
                    onChange={(e) => {
                      const newRanges = [...scoreRanges];
                      newRanges[idx].description = e.target.value;
                      setScoreRanges(newRanges);
                    }}
                  />
                </div>
              ))}
            </div>

            {scoreRanges.length > 0 && (
              <button onClick={saveScoreRanges} className="btn-primary mt-4">
                Save Score Ranges
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
