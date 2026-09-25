import React, { useState } from 'react';
import { X, Upload, Trash2, Calendar, Clock, AlertTriangle, Building2, User, Phone, FileText, FolderKanban } from 'lucide-react';
import { InterventionRequest, InterventionPriority, DefectPhoto, Project } from '../types';
import { generateNextCode } from '../lib/storage';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newReq: InterventionRequest) => void;
  currentUserName: string;
  existingInterventions: InterventionRequest[];
  projects: Project[];
  defaultProjectId?: string;
  onAddNewProject?: () => void;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUserName,
  existingInterventions,
  projects,
  defaultProjectId,
  onAddNewProject,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId || (projects[0]?.id ?? 'proj-workbank')
  );
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState(currentUserName || 'Mario Rossi');
  const [clientContact, setClientContact] = useState('');
  const [siteName, setSiteName] = useState(() => {
    const proj = projects.find(p => p.id === (defaultProjectId || projects[0]?.id));
    return proj ? `${proj.name} - Facility` : '';
  });
  const [siteAddress, setSiteAddress] = useState(() => {
    const proj = projects.find(p => p.id === (defaultProjectId || projects[0]?.id));
    return proj?.siteAddress || '';
  });
  const [description, setDescription] = useState('');
  const [desiredAccessDate, setDesiredAccessDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [desiredAccessTime, setDesiredAccessTime] = useState('09:00');
  const [priority, setPriority] = useState<InterventionPriority>('medium');
  const [notes, setNotes] = useState('');
  const [defectPhotos, setDefectPhotos] = useState<DefectPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  // When selected project changes, update default site name and address
  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    const p = projects.find(item => item.id === projId);
    if (p) {
      if (!siteName || siteName.includes('- Facility') || siteName.includes('- Impianto')) {
        setSiteName(`${p.name} - Facility`);
      }
      if (p.siteAddress) {
        setSiteAddress(p.siteAddress);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    const files = Array.from(e.target.files);
    let processed = 0;
    const newPhotos: DefectPhoto[] = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newPhotos.push({
            id: 'photo_' + Math.random().toString(36).substring(2, 9),
            url: event.target.result as string,
            name: file.name,
            uploadedAt: new Date().toISOString()
          });
        }
        processed++;
        if (processed === files.length) {
          setDefectPhotos(prev => [...prev, ...newPhotos]);
          setUploading(false);
        }
      };
      reader.onerror = () => {
        processed++;
        if (processed === files.length) setUploading(false);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (id: string) => {
    setDefectPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim() || !siteName.trim() || !description.trim()) {
      alert('Please fill in all mandatory fields marked with *');
      return;
    }

    const proj = projects.find(p => p.id === selectedProjectId);
    const projCode = proj ? `INT-${proj.code}` : 'INT';

    const newIntervention: InterventionRequest = {
      id: 'int_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      code: generateNextCode(existingInterventions, projCode),
      projectId: selectedProjectId,
      projectName: proj?.name || 'General',
      title: title.trim(),
      siteName: siteName.trim(),
      siteAddress: siteAddress.trim(),
      clientName: clientName.trim(),
      clientContact: clientContact.trim(),
      description: description.trim(),
      desiredAccessDate,
      desiredAccessTime,
      priority,
      defectPhotos,
      notes: notes.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSubmit(newIntervention);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">New Service Request</h3>
              <p className="text-xs text-slate-400">Classify the service request by project and describe the defect</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Reference Project Selection */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                <FolderKanban className="w-4 h-4" />
                <span>Reference Project</span>
                <span className="text-rose-400">*</span>
              </label>
              {onAddNewProject && (
                <button
                  type="button"
                  onClick={onAddNewProject}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 underline"
                >
                  <span>+ Create New Project</span>
                </button>
              )}
            </div>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.code}) — {proj.description}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Defects and tasks will be catalogued specifically under this project.
            </p>
          </div>

          {/* Defect Title / Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Subject / Defect Title or Task <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Move KNX power supply under UPS / Sensor fault"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Site & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                Facility / Department <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. 1st Floor Offices, Main Switchboard"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Site Address
              </label>
              <input
                type="text"
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                placeholder="Street, City, Postal Code"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Requester & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Requester / Contact Person <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone Number / Email
              </label>
              <input
                type="text"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                placeholder="e.g. +39 02 8877665"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Problem description / What needs to be done */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Detailed Problem Description / Scope of Work <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be carried out, components to check, system modifications or observed malfunctions..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Desired Access Date & Time + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Desired Access Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={desiredAccessDate}
                onChange={(e) => setDesiredAccessDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Desired Time
              </label>
              <input
                type="time"
                value={desiredAccessTime}
                onChange={(e) => setDesiredAccessTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Task Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as InterventionPriority)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low (Standard)</option>
                <option value="medium">Medium (Regular)</option>
                <option value="high">High (Priority)</option>
                <option value="urgent">Urgent (System Down)</option>
              </select>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Defect Photos / Images (optional)
            </label>
            <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/70 rounded-xl p-4 text-center transition bg-slate-800/40">
              <input
                type="file"
                multiple
                accept="image/*"
                id="photo-upload"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-white"
              >
                <Upload className="w-6 h-6 text-blue-400" />
                <span className="text-xs font-medium">
                  {uploading ? 'Uploading images...' : 'Click to select or take photos of the defect'}
                </span>
                <span className="text-[10px] text-slate-500">JPG, PNG, WEBP</span>
              </label>
            </div>

            {defectPhotos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-3">
                {defectPhotos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-800 aspect-square">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 transition shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-slate-300 px-1 py-0.5 truncate text-center">
                      {photo.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Multiline Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notes for Technician (Multiline)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. PPE required: safety boots and helmet.&#10;Press Enter to insert a new line...&#10;Access window: 08:30 - 18:00"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y whitespace-pre-wrap leading-relaxed"
            />
            <span className="text-[10px] text-slate-400">Press Enter to move down to a new line</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-600/25 active:scale-95"
            >
              Submit Service Request
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
