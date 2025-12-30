'use client';

/**
 * Admin User Management Page
 * Create and manage captain users
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CaptainUser {
  id: string;
  user_id: string;
  display_name: string;
  role: string;
  commission_rate: number;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<CaptainUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'internal' as 'admin' | 'internal' | 'external_captain' | 'yacht_crew' | 'expert',
    commissionRate: '0.00',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.displayName) {
      alert('Please fill in all required fields');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      alert('User created successfully! Password setup email sent.');
      setShowCreateForm(false);
      setNewUser({
        email: '',
        displayName: '',
        role: 'internal',
        commissionRate: '0.00',
      });
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const deactivateUser = async (userId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${displayName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate user');
      }

      alert('User deactivated successfully');
      loadUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert(error instanceof Error ? error.message : 'Failed to deactivate user');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/knowledge')}
            className="text-lexa-navy hover:text-lexa-gold mb-4 flex items-center gap-2"
          >
            ← Back to Portal
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-lexa-navy mb-2">
                User Management
              </h1>
              <p className="text-zinc-600">
                Manage captain users and permissions
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-gradient-to-r from-lexa-navy to-lexa-gold text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              {showCreateForm ? 'Cancel' : '+ Create New Captain'}
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-lexa-navy mb-6">
              Create New Captain User
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="captain@example.com"
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Captain John Smith"
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
                >
                  <option value="admin">Admin</option>
                  <option value="internal">Internal Team</option>
                  <option value="external_captain">External Captain</option>
                  <option value="yacht_crew">Yacht Crew</option>
                  <option value="expert">Travel Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={newUser.commissionRate}
                  onChange={(e) => setNewUser(prev => ({ ...prev, commissionRate: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
                />
                <p className="text-sm text-zinc-500 mt-1">
                  Set to 0 for internal team. For external contributors, typical rates are 3-10%.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={createUser}
                  disabled={isCreating}
                  className="flex-1 px-6 py-3 bg-lexa-navy text-white rounded-lg font-semibold hover:bg-lexa-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create User'}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 bg-zinc-200 text-zinc-700 rounded-lg font-semibold hover:bg-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-8 py-6 border-b border-zinc-200">
            <h2 className="text-2xl font-bold text-lexa-navy">
              Captain Users ({users.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-zinc-500">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              No users yet. Create your first captain user to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-700">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-700">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-700">
                      Commission Rate
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-700">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-900">
                          {user.display_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-lexa-navy text-white rounded-full text-sm">
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-700">
                        {user.commission_rate}%
                      </td>
                      <td className="px-6 py-4 text-zinc-600 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => deactivateUser(user.user_id, user.display_name)}
                          className="text-red-500 hover:text-red-700 text-sm font-semibold"
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

