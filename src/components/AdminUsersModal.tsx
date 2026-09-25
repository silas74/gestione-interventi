import React, { useState } from 'react';
import { X, UserPlus, Shield, User, Key, Check, Trash2, Edit3, FolderCheck, AlertCircle, Phone, MessageCircle } from 'lucide-react';
import { UserAccount, Project, AppRole } from '../types';

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  projects: Project[];
  onSaveUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({
  isOpen,
  onClose,
  users,
  projects,
  onSaveUser,
  onDeleteUser,
}) => {
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AppRole>('user');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const startCreate = () => {
    setIsCreating(true);
    setEditingUser(null);
    setName('');
    setUsername('');
    setPassword('');
    setPhone('');
    setRole('user');
    setSelectedProjectIds(['proj-workbank']);
  };

  const startEdit = (u: UserAccount) => {
    setIsCreating(false);
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setPassword(u.password);
    setPhone(u.phone || '');
    setRole(u.role);
    setSelectedProjectIds(u.assignedProjectIds || []);
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingUser(null);
  };

  const handleToggleProject = (projId: string) => {
    if (selectedProjectIds.includes('*')) {
      // If was all, switch to individual selection excluding or including
      setSelectedProjectIds(projects.map(p => p.id).filter(id => id !== projId));
      return;
    }

    if (selectedProjectIds.includes(projId)) {
      setSelectedProjectIds(prev => prev.filter(id => id !== projId));
    } else {
      setSelectedProjectIds(prev => [...prev, projId]);
    }
  };

  const handleSelectAllProjects = () => {
    if (selectedProjectIds.includes('*') || selectedProjectIds.length === projects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(['*']);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) {
      alert('All fields are required.');
      return;
    }

    const updatedUser: UserAccount = {
      id: editingUser ? editingUser.id : 'usr_' + Date.now().toString(36),
      name: name.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim(),
      phone: phone.trim() || undefined,
      role: editingUser?.username === 'costantino' ? 'admin' : role,
      assignedProjectIds: selectedProjectIds.length === 0 ? ['proj-workbank'] : selectedProjectIds,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString()
    };

    onSaveUser(updatedUser);
    cancelForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>User & Permissions Administration Panel</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Costantino Only (Admin)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Create users, set manual credentials, modify permissions and allocate projects
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Action to create new user */}
          {!isCreating && !editingUser && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Registered System Users ({users.length})
              </span>
              <button
                onClick={startCreate}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>New User</span>
              </button>
            </div>
          )}

          {/* Form for Creating / Editing User */}
          {(isCreating || editingUser) && (
            <form onSubmit={handleSubmit} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-400" />
                  <span>{isCreating ? 'Create New User' : `Edit User: ${editingUser?.name}`}</span>
                </h4>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role / Permissions <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={role}
                    disabled={editingUser?.username === 'costantino'}
                    onChange={(e) => setRole(e.target.value as AppRole)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  >
                    <option value="user">Requester User (Submits requests, downloads PDFs and signs feedback)</option>
                    <option value="technician">Field Technician (Takes charge and performs service tasks)</option>
                    <option value="admin">SuperAdmin (Costantino - Full Control)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Login Username <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingUser?.username === 'costantino'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. jdoe"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Assigned Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Manual password to communicate to user"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Phone / Mobile Number (optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +39 348 1122334"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Assign Projects */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FolderCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Assign Projects User Has Access To:</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllProjects}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                  >
                    {selectedProjectIds.includes('*') || selectedProjectIds.length === projects.length ? 'Deselect all' : 'Assign All Projects'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {projects.map((proj) => {
                    const isSelected = selectedProjectIds.includes('*') || selectedProjectIds.includes(proj.id);
                    return (
                      <div
                        key={proj.id}
                        onClick={() => handleToggleProject(proj.id)}
                        className={`cursor-pointer p-2.5 rounded-xl border flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500/50 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold">{proj.name} ({proj.code})</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{proj.description}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                          isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow"
                >
                  {isCreating ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* User List */}
          <div className="space-y-3">
            {users.map((u) => {
              const isCostantino = u.username === 'costantino';
              const assignedProjs = u.assignedProjectIds.includes('*')
                ? 'All projects'
                : projects.filter(p => u.assignedProjectIds.includes(p.id)).map(p => p.name).join(', ') || 'No projects assigned';

              return (
                <div
                  key={u.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-0.5 ${
                      u.role === 'admin' ? 'bg-amber-500/10 text-amber-400' :
                      (u.role === 'technician' || u.role === 'tecnico') ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {u.role === 'admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{u.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          u.role === 'admin' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                          (u.role === 'technician' || u.role === 'tecnico') ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {u.role.toUpperCase()}
                        </span>
                        {isCostantino && (
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                            SuperAdmin
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex items-center flex-wrap gap-x-3 gap-y-1">
                        <span>User: <strong className="text-slate-200 font-mono">{u.username}</strong></span>
                        <span>Password: <strong className="text-amber-300 font-mono">{u.password}</strong></span>
                        {u.phone ? (
                          <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <a href={`tel:${u.phone.replace(/\s+/g, '')}`} className="text-emerald-300 font-mono hover:underline">
                              {u.phone}
                            </a>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">(No phone set)</span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-1">
                        Assigned projects: <span className="text-blue-300 font-medium">{assignedProjs}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => startEdit(u)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      title="Edit permissions and credentials"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Edit</span>
                    </button>

                    {!isCostantino && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete user ${u.name}?`)) {
                            onDeleteUser(u.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
};
