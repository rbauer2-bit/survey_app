import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Mail, Server, CheckCircle, XCircle, AlertCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from_email: string;
  from_name: string;
}

export default function SMTPSettings() {
  const [loading, setLoading] = useState(true);
  const [hasConfig, setHasConfig] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<SMTPConfig>({
    host: '',
    port: 587,
    secure: false,
    auth: {
      user: '',
      pass: '',
    },
    from_email: '',
    from_name: '',
  });

  const [testEmail, setTestEmail] = useState('');
  const [showTestForm, setShowTestForm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.getSMTPSettings();
      const config = response.data.smtp_config;

      if (config) {
        setFormData(config);
        setHasConfig(true);
      }
    } catch (error) {
      console.error('Failed to load SMTP settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.host || !formData.auth.user || !formData.auth.pass || !formData.from_email || !formData.from_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      await api.updateSMTPSettings(formData);
      toast.success('SMTP settings saved successfully!');
      setHasConfig(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save SMTP settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    try {
      setTesting(true);
      await api.testSMTPSettings({
        ...formData,
        test_email: testEmail,
      });
      toast.success(`Test email sent successfully to ${testEmail}!`);
      setShowTestForm(false);
      setTestEmail('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'SMTP test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove your SMTP configuration? Emails will be sent using the default server.')) {
      return;
    }

    try {
      await api.deleteSMTPSettings();
      toast.success('SMTP configuration removed');
      setFormData({
        host: '',
        port: 587,
        secure: false,
        auth: { user: '', pass: '' },
        from_email: '',
        from_name: '',
      });
      setHasConfig(false);
    } catch (error) {
      toast.error('Failed to remove SMTP configuration');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SMTP settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Server className="text-primary-600" size={32} />
          <h1 className="text-3xl font-bold text-gray-900">Email Configuration</h1>
        </div>
        <p className="text-gray-600">
          Configure your own SMTP server to send branded emails from your domain
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Why configure SMTP?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Send emails from your own domain (e.g., noreply@yourdomain.com)</li>
              <li>Maintain brand consistency across all communications</li>
              <li>Better email deliverability using your domain reputation</li>
              <li>Full control over your email infrastructure</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="text-gray-600" size={20} />
              <h2 className="text-xl font-semibold text-gray-900">SMTP Server Configuration</h2>
            </div>
            {hasConfig && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 size={16} />
                Remove Config
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Server Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Host <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Your SMTP server hostname</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                placeholder="587"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Common: 587 (TLS), 465 (SSL), 25</p>
            </div>
          </div>

          {/* Secure Connection */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="secure"
              checked={formData.secure}
              onChange={(e) => setFormData({ ...formData, secure: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="secure" className="text-sm font-medium text-gray-700">
              Use SSL/TLS (recommended for port 465)
            </label>
          </div>

          {/* Authentication */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentication</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username/Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.auth.user}
                  onChange={(e) => setFormData({
                    ...formData,
                    auth: { ...formData.auth, user: e.target.value }
                  })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.auth.pass}
                    onChange={(e) => setFormData({
                      ...formData,
                      auth: { ...formData.auth, pass: e.target.value }
                    })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  For Gmail, use an App Password (not your regular password)
                </p>
              </div>
            </div>
          </div>

          {/* From Details */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email From Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.from_email}
                  onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                  placeholder="noreply@yourdomain.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Email address shown to recipients</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.from_name}
                  onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                  placeholder="Your Company Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">Name shown to recipients</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
            >
              <CheckCircle size={20} />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>

            <button
              type="button"
              onClick={() => setShowTestForm(!showTestForm)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition"
            >
              <Mail size={20} />
              Test Connection
            </button>
          </div>
        </form>

        {/* Test Email Form */}
        {showTestForm && (
          <div className="px-6 pb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Test SMTP Configuration</h3>
              <p className="text-sm text-gray-600 mb-4">
                Send a test email to verify your SMTP settings are working correctly
              </p>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={handleTest}
                  disabled={testing || !testEmail}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {testing ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Provider Examples */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular SMTP Providers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gmail */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Gmail</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Host:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">smtp.gmail.com</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Port:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">587</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SSL:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">No</code>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ⚠️ Requires App Password (2FA must be enabled)
              </p>
            </div>
          </div>

          {/* Office 365 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Office 365 / Outlook</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Host:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">smtp.office365.com</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Port:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">587</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">SSL:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">No</code>
              </div>
            </div>
          </div>

          {/* SendGrid */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">SendGrid</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Host:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">smtp.sendgrid.net</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Port:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">587</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Username:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">apikey</code>
              </div>
            </div>
          </div>

          {/* Custom Domain */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Custom Domain (cPanel)</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Host:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">mail.yourdomain.com</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Port:</span>
                <code className="bg-gray-100 px-2 py-1 rounded">587 or 465</code>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Contact your hosting provider for specific details
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
