import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '../lib/api';
import {
  Globe,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  RefreshCw,
  Power,
  PowerOff,
  Copy,
  ExternalLink
} from 'lucide-react';

export default function CustomDomains() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: domains, isLoading } = useQuery({
    queryKey: ['custom-domains'],
    queryFn: async () => {
      const response = await api.getCustomDomains();
      return response.data.domains;
    },
  });

  const { data: assessments } = useQuery({
    queryKey: ['assessments-for-domains'],
    queryFn: async () => {
      const response = await api.getAssessments();
      return response.data.assessments.filter((a: any) => a.status === 'published');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createCustomDomain(data),
    onSuccess: () => {
      toast.success('Custom domain added!');
      queryClient.invalidateQueries({ queryKey: ['custom-domains'] });
      setShowAddForm(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add domain');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCustomDomain(id),
    onSuccess: () => {
      toast.success('Domain deleted');
      queryClient.invalidateQueries({ queryKey: ['custom-domains'] });
      setSelectedDomain(null);
    },
    onError: () => toast.error('Failed to delete domain'),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => api.verifyCustomDomain(id),
    onSuccess: (response) => {
      const verified = response.data.verification.verified;
      if (verified) {
        toast.success('Domain verified successfully!');
      } else {
        toast.warning(response.data.verification.message);
      }
      queryClient.invalidateQueries({ queryKey: ['custom-domains'] });
    },
    onError: () => toast.error('Verification check failed'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.activateCustomDomain(id),
    onSuccess: () => {
      toast.success('Domain activated!');
      queryClient.invalidateQueries({ queryKey: ['custom-domains'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to activate');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.deactivateCustomDomain(id),
    onSuccess: () => {
      toast.success('Domain deactivated');
      queryClient.invalidateQueries({ queryKey: ['custom-domains'] });
    },
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      verified: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      failed: { color: 'bg-red-100 text-red-700', icon: XCircle },
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color} flex items-center gap-1`}>
        <Icon size={14} />
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Domains</h1>
          <p className="text-gray-600 mt-1">
            Connect your own domains to your assessments
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Domain
        </button>
      </div>

      {/* Add Domain Form */}
      {showAddForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Custom Domain</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Subdomain (optional)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="quiz"
                  {...register('subdomain')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use root domain
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Domain *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="example.com"
                  {...register('domain', { required: true })}
                />
                {errors.domain && (
                  <p className="text-red-600 text-sm mt-1">Domain is required</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Link to Assessment (optional)
              </label>
              <select className="input" {...register('assessment_id')}>
                <option value="">-- Select Assessment --</option>
                {assessments?.map((assessment: any) => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                You can link it later if needed
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Domain'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  reset();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Domains List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : domains && domains.length > 0 ? (
        <div className="space-y-4">
          {domains.map((domain: any) => (
            <div key={domain.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="text-primary-600" size={20} />
                    <h3 className="text-lg font-semibold">{domain.full_domain}</h3>
                    {getStatusBadge(domain.verification_status)}
                    {domain.is_active && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        Active
                      </span>
                    )}
                  </div>

                  {domain.assessment_title && (
                    <p className="text-sm text-gray-600 mb-2">
                      Linked to: <span className="font-medium">{domain.assessment_title}</span>
                    </p>
                  )}

                  {domain.is_active && (
                    <div className="flex items-center gap-2 mt-3">
                      <a
                        href={`https://${domain.full_domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                      >
                        Visit domain
                        <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={() => copyToClipboard(`https://${domain.full_domain}`)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {domain.verification_status === 'pending' && (
                    <button
                      onClick={() => verifyMutation.mutate(domain.id)}
                      disabled={verifyMutation.isPending}
                      className="btn-secondary flex items-center gap-2 text-sm"
                      title="Check verification"
                    >
                      <RefreshCw size={16} />
                      Verify
                    </button>
                  )}

                  {domain.verification_status === 'verified' && !domain.is_active && (
                    <button
                      onClick={() => activateMutation.mutate(domain.id)}
                      disabled={activateMutation.isPending}
                      className="btn-primary flex items-center gap-2 text-sm"
                    >
                      <Power size={16} />
                      Activate
                    </button>
                  )}

                  {domain.is_active && (
                    <button
                      onClick={() => deactivateMutation.mutate(domain.id)}
                      disabled={deactivateMutation.isPending}
                      className="btn-secondary flex items-center gap-2 text-sm"
                    >
                      <PowerOff size={16} />
                      Deactivate
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedDomain(domain)}
                    className="btn-secondary text-sm"
                  >
                    Setup
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Delete this domain?')) {
                        deleteMutation.mutate(domain.id);
                      }
                    }}
                    className="btn-danger flex items-center gap-2 text-sm px-3"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Globe className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No custom domains yet
          </h3>
          <p className="text-gray-600 mb-6">
            Add a custom domain to brand your assessments with your own domain
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Add Your First Domain
          </button>
        </div>
      )}

      {/* Domain Setup Modal */}
      {selectedDomain && (
        <DomainSetupModal
          domain={selectedDomain}
          onClose={() => setSelectedDomain(null)}
        />
      )}
    </div>
  );
}

function DomainSetupModal({ domain, onClose }: { domain: any; onClose: () => void }) {
  const { data: domainDetails } = useQuery({
    queryKey: ['domain-details', domain.id],
    queryFn: async () => {
      const response = await api.getCustomDomain(domain.id);
      return response.data;
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const instructions = domainDetails?.dns_instructions;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Domain Setup: {domain.full_domain}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          {/* Step 1: Verification */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm">
                1
              </span>
              Verify Domain Ownership
            </h3>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium mb-2">Add this TXT record:</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Type:</p>
                  <code className="bg-white px-2 py-1 rounded border">TXT</code>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Name:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-2 py-1 rounded border flex-1 truncate">
                      {instructions?.verification.name}
                    </code>
                    <button
                      onClick={() => copyToClipboard(instructions?.verification.name)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Value:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-2 py-1 rounded border flex-1 truncate">
                      {instructions?.verification.value}
                    </code>
                    <button
                      onClick={() => copyToClipboard(instructions?.verification.value)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <ol className="text-sm space-y-2 text-gray-600">
              {instructions?.verification.instructions.map((step: string, idx: number) => (
                <li key={idx}>
                  {idx + 1}. {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Step 2: DNS Configuration */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm">
                2
              </span>
              Configure DNS Routing
            </h3>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium mb-2">Add this CNAME record:</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Type:</p>
                  <code className="bg-white px-2 py-1 rounded border">CNAME</code>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Name:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-2 py-1 rounded border flex-1 truncate">
                      {instructions?.routing.name}
                    </code>
                    <button
                      onClick={() => copyToClipboard(instructions?.routing.name)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Value:</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-white px-2 py-1 rounded border flex-1 truncate">
                      {instructions?.routing.value}
                    </code>
                    <button
                      onClick={() => copyToClipboard(instructions?.routing.value)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <ol className="text-sm space-y-2 text-gray-600">
              {instructions?.routing.instructions.map((step: string, idx: number) => (
                <li key={idx}>
                  {idx + 1}. {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> DNS changes can take 5-30 minutes to propagate. After
              adding the records, click the "Verify" button to check the status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
