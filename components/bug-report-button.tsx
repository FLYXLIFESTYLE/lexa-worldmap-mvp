'use client';

import { useState } from 'react';

/**
 * Bug Report Button - Available to ALL users
 * Floating button in bottom-right corner
 * Opens modal to submit bug reports
 */

export default function BugReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    category: 'other' as string,
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    reporter_name: '',
    reporter_email: ''
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          page_url: window.location.href
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setIsOpen(false);
          setSubmitted(false);
          setFormData({
            title: '',
            description: '',
            severity: 'medium',
            category: 'other',
            steps_to_reproduce: '',
            expected_behavior: '',
            actual_behavior: '',
            reporter_name: '',
            reporter_email: ''
          });
        }, 3000);
      } else {
        alert('Failed to submit bug report: ' + data.error);
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      alert('Failed to submit bug report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 transition-all hover:scale-110"
        title="Report a bug"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-red-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">🐛 Report a Bug</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-red-100 mt-2">
                Help us improve LEXA by reporting any issues you encounter
              </p>
            </div>

            {/* Success Message */}
            {submitted ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">
                  Thank You!
                </h3>
                <p className="text-gray-700">
                  Your bug report has been submitted. We'll review it and get back to you soon.
                </p>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bug Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Describe what went wrong..."
                    rows={3}
                    required
                  />
                </div>

                {/* Severity & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Severity
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="low">🔵 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🟠 High</option>
                      <option value="critical">🔴 Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="ui">🎨 UI/Design</option>
                      <option value="api">⚙️ API/Backend</option>
                      <option value="database">💾 Database</option>
                      <option value="performance">⚡ Performance</option>
                      <option value="security">🔒 Security</option>
                      <option value="other">📝 Other</option>
                    </select>
                  </div>
                </div>

                {/* Expandable Advanced Fields */}
                <details className="bg-gray-50 p-4 rounded-lg">
                  <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                    ▶ Additional Details (Optional)
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Steps to Reproduce
                      </label>
                      <textarea
                        value={formData.steps_to_reproduce}
                        onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="1. Go to...\n2. Click on...\n3. See error..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expected Behavior
                      </label>
                      <input
                        type="text"
                        value={formData.expected_behavior}
                        onChange={(e) => setFormData({ ...formData, expected_behavior: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="What should happen?"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Actual Behavior
                      </label>
                      <input
                        type="text"
                        value={formData.actual_behavior}
                        onChange={(e) => setFormData({ ...formData, actual_behavior: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        placeholder="What actually happened?"
                      />
                    </div>
                  </div>
                </details>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.reporter_name}
                      onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={formData.reporter_email}
                      onChange={(e) => setFormData({ ...formData, reporter_email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> We'll automatically capture the current page URL and your browser info to help us reproduce the issue.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

