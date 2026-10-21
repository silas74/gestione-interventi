import React, { useState } from 'react';
import { X, Upload, Trash2, Calendar, Clock, AlertTriangle, Building2, User, Phone, FileText, FolderKanban, Wrench, ClipboardList, Plus, CheckSquare } from 'lucide-react';
import { InterventionRequest, InterventionPriority, DefectPhoto, Project, RecordCategory, ActionStep } from '../types';
import { generateNextCode } from '../lib/storage';
import { compressAndProcessImage } from '../lib/photoUtils';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newReq: InterventionRequest) => void;
  currentUserName: string;
  existingInterventions: InterventionRequest[];
  projects: Project[];
  defaultProjectId?: string;
  defaultRecordType?: RecordCategory;
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
  defaultRecordType = 'intervention',
  onAddNewProject,
}) => {
  const [recordType, setRecordType] = useState<RecordCategory>(defaultRecordType);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId || (projects[0]?.id ?? 'proj-workbank')
  );
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState(currentUserName || 'Costantino');
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

  // Action steps checklist state
  const [actionSteps, setActionSteps] = useState<ActionStep[]>([]);
  const [newStepText, setNewStepText] = useState('');

  if (!isOpen) return null;

  const isProjectWork = recordType === 'project_work';

  const handleAddActionStep = () => {
    const trimmed = newStepText.trim();
    if (!trimmed) return;
    setActionSteps(prev => [
      ...prev,
      {
        id: 'act_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        text: trimmed,
        completed: false,
      }
    ]);
    setNewStepText('');
  };

  const handleRemoveActionStep = (id: string) => {
    setActionSteps(prev => prev.filter(s => s.id !== id));
  };

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    const files = Array.from(e.target.files);
    try {
      const newPhotos = await Promise.all(
        files.map((file) => compressAndProcessImage(file))
      );
      setDefectPhotos(prev => [...prev, ...newPhotos]);
    } catch (err) {
      console.error('Error compressing defect photos:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
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
    const prefix = isProjectWork ? 'LAV' : 'INT';
    const projCode = proj ? `${prefix}-${proj.code}` : prefix;

    // Include any pending text in newStepText if user didn't click "+"
    const finalSteps = newStepText.trim()
      ? [
          ...actionSteps,
          {
            id: 'act_' + Date.now().toString(36) + '_last',
            text: newStepText.trim(),
            completed: false,
          }
        ]
      : actionSteps;

    const newIntervention: InterventionRequest = {
      id: (isProjectWork ? 'lav_' : 'int_') + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      code: generateNextCode(existingInterventions, projCode),
      recordType,
      actionSteps: finalSteps,
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
            <div className={`p-2 rounded-lg ${isProjectWork ? 'bg-indigo-500/15 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {isProjectWork ? <ClipboardList className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isProjectWork ? 'Nuovo Lavoro / Azione su Progetto' : 'New Service Request / Defect'}
              </h3>
              <p className="text-xs text-slate-400">
                {isProjectWork
                  ? 'Pianifica un lavoro, modifica o lista di azioni da fare su uno dei tuoi progetti'
                  : 'Classify the service request by project and describe the defect'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          {/* Category Selector: Intervento/Guasto vs Lavoro/Azione Progetto */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setRecordType('intervention')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
                !isProjectWork
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>🛠️ Intervento / Guasto</span>
            </button>
            <button
              type="button"
              onClick={() => setRecordType('project_work')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
                isProjectWork
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40 ring-1 ring-indigo-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>📋 Lavoro / Azione Progetto</span>
            </button>
          </div>
          
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
              {isProjectWork
                ? 'Descrizione del Lavoro / Obiettivo su Progetto *'
                : 'Detailed Problem Description / Scope of Work *'}
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isProjectWork
                  ? 'Descrivi il lavoro da svolgere sul progetto, le modifiche da apportare o le verifiche previste...'
                  : 'Describe what needs to be carried out, components to check, system modifications or observed malfunctions...'
              }
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 📋 CHECKLIST AZIONI DA FARE SUL PROGETTO */}
          <div className={`p-3.5 rounded-xl border space-y-2.5 ${
            isProjectWork
              ? 'bg-indigo-950/25 border-indigo-700/50'
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                <span>Azioni da Fare / Checklist Operativa ({actionSteps.length})</span>
              </label>
              <span className="text-[10px] text-slate-400">Spuntabili direttamente sulla scheda</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddActionStep();
                  }
                }}
                placeholder="Aggiungi un'azione da fare (es. Programmazione ETS, Test sensori, Backup) e premi Invio..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddActionStep}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Aggiungi</span>
              </button>
            </div>

            {actionSteps.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 pt-1">
                {actionSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-indigo-400 font-bold">#{idx + 1}</span>
                      <span className="truncate">{step.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveActionStep(step.id)}
                      className="text-slate-500 hover:text-rose-400 p-0.5 transition shrink-0"
                      title="Rimuovi azione"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              className={`px-5 py-2 rounded-lg text-xs font-semibold text-white transition shadow-lg active:scale-95 ${
                isProjectWork
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/25'
              }`}
            >
              {isProjectWork ? 'Salva Lavoro / Azione su Progetto' : 'Submit Service Request'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
