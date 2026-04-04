import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, UserX, UserCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserModal, SystemUser, UserFormData } from '../../components/manage/UserModal';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  VIEWER: 'Viewer',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-indigo-100 text-indigo-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  VIEWER: 'bg-slate-100 text-slate-600',
};

export function UsersPage() {
  const { accessToken, user: currentUser } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);

  const fetchUsers = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load users');
      setUsers(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSave = async (data: UserFormData) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    if (selectedUser) {
      const body: Partial<UserFormData> = { name: data.name, email: data.email, role: data.role, isActive: data.isActive };
      if (data.password) body.password = data.password;
      const res = await fetch(`/api/auth/users/${selectedUser.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }
    } else {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Create failed');
      }
    }

    setIsModalOpen(false);
    setSelectedUser(null);
    fetchUsers();
  };

  const handleToggleActive = async (user: SystemUser) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${user.name}"? ${user.isActive ? 'Their active sessions will be revoked.' : ''}`)) return;
    const res = await fetch(`/api/auth/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Update failed');
      return;
    }
    fetchUsers();
  };

  const openAdd = () => { setSelectedUser(null); setIsModalOpen(true); };
  const openEdit = (user: SystemUser) => { setSelectedUser(user); setIsModalOpen(true); };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mr-3" />
        Loading users…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-rose-500">
        <ShieldAlert size={32} />
        <p>{error}</p>
        <button onClick={fetchUsers} className="text-sm text-indigo-600 hover:underline">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500">Manage system users and access levels.</p>
        </div>
        <button
          onClick={openAdd}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add User
        </button>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className={`transition-colors ${user.isActive ? 'hover:bg-slate-50' : 'bg-slate-50/60 opacity-70'}`}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 leading-tight">{user.name}</div>
                        {user.id === currentUser?.id && (
                          <div className="text-xs text-indigo-500 font-medium">You</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600 text-sm">{user.email}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        title="Edit user"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleToggleActive(user)}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.isActive
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No users found. Add your first user above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedUser(null); }}
        onSubmit={handleSave}
        selectedUser={selectedUser}
      />
    </div>
  );
}
