import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Folder, Trash2, Edit3, Building, MapPin, Check } from 'lucide-react';
import { Project } from '../types';

interface ProjectManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onSaveProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  initialCreate?: boolean;
}

export const ProjectManagementModal: React.FC<ProjectManagementModalProps> = ({
  isOpen,
  onClose,
  projects,
  onSaveProject,
  onDeleteProject,
  initialCreate = false,
}) => {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialCreate) {
        setIsCreating(true);
        setEditingProject(null);
        setName('');
        setCode('');
        setDescription('');
        setClientName('');
        setSiteAddress('');
      } else {
        setIsCreating(false);
        setEditingProject(null);
      }
    }
  }, [isOpen, initialCreate]);

  if (!isOpen) return null;

  const startCreate = () => {
    setIsCreating(true);
    setEditingProject(null);
    setName('');
    setCode('');
    setDescription('');
    setClientName('');
    setSiteAddress('');
  };

  const startEdit = (p: Project) => {
    setIsCreating(false);
    setEditingProject(p);
    setName(p.name);
    setCode(p.code);
    setDescription(p.description);
    setClientName(p.clientName || '');
    setSiteAddress(p.siteAddress || '');
  };

  const cancelForm = () => {
    setIsCreating(false);
    setEditingProject(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      alert('Project name and code are required.');
      return;
    }

    const updated: Project = {
      id: editingProject ? editingProject.id : 'proj_' + Date.now().toString(36),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      clientName: clientName.trim(),
      siteAddress: siteAddress.trim(),
      createdAt: editingProject ? editingProject.createdAt : new Date().toISOString()
    };

    onSaveProject(updated);
    cancelForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Project & Site Management</h3>
              <p className="text-xs text-slate-400">Classify defects and service tasks by project</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {!isCreating && !editingProject && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Active Projects ({projects.length})
              </span>
              <button
                onClick={startCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition"
              >
                <FolderPlus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            </div>
          )}

          {(isCreating || editingProject) && (
            <form onSubmit={handleSubmit} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3.5">
              <h4 className="text-sm font-bold text-white mb-2">
                {isCreating ? 'New Project' : `Edit Project: ${editingProject?.name}`}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Project Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Workbank"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Short Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. WRKB"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Plant / Project Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Facility description, equipment types, technologies..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Client / Customer
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Workbank Corp"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Site / Facility Address
                  </label>
                  <input
                    type="text"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    placeholder="Street, City"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={cancelForm}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Save Project
                </button>
              </div>
            </form>
          )}

          {/* List */}
          <div className="space-y-2.5">
            {projects.map((p) => (
              <div
                key={p.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{p.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-800/40">
                      {p.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{p.description}</p>
                  {p.clientName && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Client: {p.clientName} {p.siteAddress ? `— Site: ${p.siteAddress}` : ''}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startEdit(p)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete project ${p.name}?`)) onDeleteProject(p.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};
