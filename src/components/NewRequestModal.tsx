import React, { useState, useEffect } from 'react';
import { 
  X, Upload, Trash2, Calendar, Clock, AlertTriangle, Building2, User, Phone, 
  FileText, FolderKanban, Wrench, ClipboardList, Plus, CheckSquare, Mail, 
  MessageCircle, Hourglass, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { 
  InterventionRequest, InterventionPriority, InterventionStatus, DefectPhoto, 
  Project, RecordCategory, ActionStep, FollowUpChannel, ProjectTrackingEntry 
} from '../types';
import { generateNextCode } from '../lib/storage';
import { compressAndProcessImage, extractImagesFromClipboard } from '../lib/photoUtils';

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
  defaultRecordType = 'project_work',
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
  const [focusStepId, setFocusStepId] = useState<string | null>(null);

  // Project Work Tracking State (Cosa ho fatto, Email/WhatsApp, Data, Da chi aspetto risposta, Prossimo step)
  const [whatIDid, setWhatIDid] = useState('');
  const [followUpChannel, setFollowUpChannel] = useState<FollowUpChannel>('email');
  const [actionDate, setActionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [waitingReplyFrom, setWaitingReplyFrom] = useState('');
  const [followUpDueDate, setFollowUpDueDate] = useState('');
  const [nextActionToDo, setNextActionToDo] = useState('');
  const [referenceDoc, setReferenceDoc] = useState('');
  const [workStatus, setWorkStatus] = useState<InterventionStatus>('in_progress');

  // Support Ctrl+V image paste in modal (great for pasting WhatsApp/Email screenshots in Project Work!)
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const imgs = extractImagesFromClipboard(e.clipboardData);
      if (imgs.length > 0) {
        e.preventDefault();
        setUploading(true);
        try {
          const processed = await Promise.all(
            imgs.map((blob, i) => compressAndProcessImage(blob, `screenshot_${i + 1}.jpg`))
          );
          setDefectPhotos(prev => [...prev, ...processed]);
        } catch (err) {
          console.error('Error pasting image:', err);
        } finally {
          setUploading(false);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  const isProjectWork = recordType === 'project_work';

  const handleAddActionStep = () => {
    const trimmed = newStepText.trim();
    const newId = 'act_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    if (trimmed) {
      setActionSteps(prev => [
        ...prev,
        {
          id: newId,
          text: trimmed,
          completed: false,
        }
      ]);
      setNewStepText('');
      return;
    }

    // If newStepText is empty, check if user typed in nextActionToDo above and clicked "+ Aggiungi"
    if (nextActionToDo.trim() && !actionSteps.some(s => s.text === nextActionToDo.trim())) {
      setActionSteps(prev => [
        ...prev,
        {
          id: newId,
          text: nextActionToDo.trim(),
          completed: false,
        }
      ]);
      return;
    }

    // Otherwise add an immediately editable blank row and focus it
    setActionSteps(prev => [
      ...prev,
      {
        id: newId,
        text: '',
        completed: false,
      }
    ]);
    setFocusStepId(newId);
  };

  const handleUpdateActionStepText = (id: string, text: string) => {
    setActionSteps(prev => prev.map(s => (s.id === id ? { ...s, text } : s)));
  };

  const handleToggleActionStepModal = (id: string) => {
    setActionSteps(prev => prev.map(s => (s.id === id ? { ...s, completed: !s.completed } : s)));
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
      console.error('Error compressing photos:', err);
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

    const proj = projects.find(p => p.id === selectedProjectId);
    const prefix = isProjectWork ? 'LAV' : 'INT';
    const projCode = proj ? `${prefix}-${proj.code}` : prefix;

    // Include any pending text in newStepText if user didn't click "+" and filter out empty rows
    const rawSteps = newStepText.trim()
      ? [
          ...actionSteps,
          {
            id: 'act_' + Date.now().toString(36) + '_last',
            text: newStepText.trim(),
            completed: false,
          }
        ]
      : actionSteps;
    const finalSteps = rawSteps
      .map(s => ({ ...s, text: s.text.trim() }))
      .filter(s => s.text.length > 0);
    const effectiveNextAction =
      nextActionToDo.trim() || finalSteps.find(s => !s.completed)?.text || '';

    if (isProjectWork) {
      // Validation specific to Lavoro / Azione su Progetto
      if (!title.trim() && !whatIDid.trim()) {
        alert('Inserisci almeno il Titolo del Lavoro o Cosa hai fatto.');
        return;
      }

      const effectiveTitle = title.trim() || whatIDid.trim().slice(0, 80);
      const effectiveWhatIDid = whatIDid.trim() || title.trim();

      const initialTrackingLogs: ProjectTrackingEntry[] = [
        {
          id: 'trk_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          date: actionDate || new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          whatIDid: effectiveWhatIDid,
          channel: followUpChannel,
          awaitingReply: Boolean(waitingReplyFrom.trim()),
          waitingReplyFrom: waitingReplyFrom.trim() || undefined,
          followUpDueDate: followUpDueDate || undefined,
          nextStep: effectiveNextAction || undefined,
          referenceDoc: referenceDoc.trim() || undefined,
        }
      ];

      const newWork: InterventionRequest = {
        id: 'lav_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        code: generateNextCode(existingInterventions, projCode),
        recordType: 'project_work',
        actionSteps: finalSteps,
        trackingLogs: initialTrackingLogs,
        whatIDidSummary: effectiveWhatIDid,
        followUpChannel,
        lastActionDate: actionDate || new Date().toISOString().split('T')[0],
        waitingReplyFrom: waitingReplyFrom.trim() || undefined,
        followUpDueDate: followUpDueDate || undefined,
        nextActionToDo: effectiveNextAction || undefined,
        projectId: selectedProjectId,
        projectName: proj?.name || 'General',
        title: effectiveTitle,
        siteName: proj?.name || 'Progetto',
        siteAddress: proj?.siteAddress || '',
        clientName: waitingReplyFrom.trim() || proj?.clientName || currentUserName || 'Costantino',
        clientContact: clientContact.trim(),
        description: effectiveWhatIDid,
        desiredAccessDate: actionDate || new Date().toISOString().split('T')[0],
        desiredAccessTime: new Date().toTimeString().slice(0, 5),
        priority,
        defectPhotos,
        notes: notes.trim(),
        status: workStatus,
        assignedTechnician: currentUserName || 'Costantino',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      onSubmit(newWork);
      onClose();
      return;
    }

    // Standard validation for Intervento / Guasto
    if (!title.trim() || !clientName.trim() || !siteName.trim() || !description.trim()) {
      alert('Please fill in all mandatory fields marked with *');
      return;
    }

    const newIntervention: InterventionRequest = {
      id: 'int_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      code: generateNextCode(existingInterventions, projCode),
      recordType: 'intervention',
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
      <div className={`relative w-full max-w-2xl bg-slate-900 border rounded-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden ${
        isProjectWork ? 'border-indigo-700/70' : 'border-slate-800'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b ${
          isProjectWork
            ? 'bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-950 border-indigo-800/60'
            : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className={`p-2 rounded-lg ${isProjectWork ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-blue-500/10 text-blue-400'}`}>
              {isProjectWork ? <ClipboardList className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isProjectWork ? '📋 Nuovo Tracking Lavoro / Azione su Progetto' : '🛠️ New Service Request / Defect'}
              </h3>
              <p className="text-xs text-slate-300">
                {isProjectWork
                  ? 'Traccia cosa hai fatto sul progetto, seguito per Email o WhatsApp, data e da chi aspetti risposta'
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

          {/* Category Switcher */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
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
          </div>

          {/* Progetto di Riferimento */}
          <div className={`p-3.5 rounded-xl border ${
            isProjectWork ? 'bg-indigo-950/30 border-indigo-700/50' : 'bg-slate-950/70 border-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <FolderKanban className="w-4 h-4 text-indigo-400" />
                <span>{isProjectWork ? 'Progetto su cui stai lavorando' : 'Reference Project'}</span>
                <span className="text-rose-400">*</span>
              </label>
              {onAddNewProject && (
                <button
                  type="button"
                  onClick={onAddNewProject}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 underline"
                >
                  <span>+ Crea Nuovo Progetto</span>
                </button>
              )}
            </div>
            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.code}) — {proj.description}
                </option>
              ))}
            </select>
          </div>

          {isProjectWork ? (
            /* =====================================================================
               MODULO DEDICATO ESCLUSIVAMENTE A "LAVORI & AZIONI PROGETTO" (TRACKING)
               ===================================================================== */
            <>
              {/* 1. Argomento / Attività del Progetto */}
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  📌 Argomento / Attività del Lavoro sul Progetto <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es. Programmazione ETS6 Piano 1, Invio schemi DALI, Taratura sensori Lux..."
                  className="w-full bg-slate-800 border border-indigo-500/50 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 2. COSA HO FATTO (Campo principale del Tracking) */}
              <div className="bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-700/60 space-y-2">
                <label className="block text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-indigo-400" />
                  <span>🛠️ Cosa ho fatto (Azione eseguita / Comunicazione inviata) *</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={whatIDid}
                  onChange={(e) => setWhatIDid(e.target.value)}
                  placeholder="Scrivi esattamente cosa hai fatto: es. 'Preparato file ETS6 e inviata tabella gruppi DALI per approvazione', oppure 'Scritto su WhatsApp per concordare accesso sale riunioni'..."
                  className="w-full bg-slate-900 border border-indigo-600/50 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                />
              </div>

              {/* 3. ESECUZIONE SEGUITA PER (EMAIL / WHATSAPP / TELEFONO / CANTIERE) + DATA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-indigo-200 mb-1.5">
                    📡 Esecuzione / Seguito per (Canale utilizzato)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFollowUpChannel('email')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition ${
                        followUpChannel === 'email'
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-900/40'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>✉️ Per Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFollowUpChannel('whatsapp')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition ${
                        followUpChannel === 'whatsapp'
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/40'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>💬 WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFollowUpChannel('phone')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition ${
                        followUpChannel === 'phone'
                          ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-900/40'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>📞 Telefono</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFollowUpChannel('on_site')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold border transition ${
                        followUpChannel === 'on_site'
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-900/40'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>🏗️ In Cantiere</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFollowUpChannel('meeting')}
                      className={`col-span-2 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-bold border transition ${
                        followUpChannel === 'meeting'
                          ? 'bg-violet-600 text-white border-violet-400 shadow-md shadow-violet-900/40'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>👥 Riunione / Call Tecnica</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-indigo-200 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>📅 Data (Quando l'ho fatto / inviato) *</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={actionDate}
                      onChange={(e) => setActionDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      📎 Documento / Schema / File inviato (opz.)
                    </label>
                    <input
                      type="text"
                      value={referenceDoc}
                      onChange={(e) => setReferenceDoc(e.target.value)}
                      placeholder="Es. Schema_QG02.pdf, Tabella_DALI.xlsx, .knxproj"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. DA CHI ASPETTO RISPOSTA + CONTATTO + SCADENZA SOLLECITO */}
              <div className="bg-amber-950/25 p-3.5 rounded-xl border border-amber-600/50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Hourglass className="w-4 h-4 text-amber-400" />
                    <span>⏳ Da chi aspetto risposta? (Lascia vuoto se non attendi risposta)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-amber-200/90 mb-1">
                      Persona / Ente da cui aspetto risposta
                    </label>
                    <input
                      type="text"
                      value={waitingReplyFrom}
                      onChange={(e) => setWaitingReplyFrom(e.target.value)}
                      placeholder="Es. Mario Rossi, Ing. Bianchi, Fornitore..."
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-amber-200/90 mb-1">
                      Telefono / Email (per sollecito rapido)
                    </label>
                    <input
                      type="text"
                      value={clientContact}
                      onChange={(e) => setClientContact(e.target.value)}
                      placeholder="Es. +39 347... o email@..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-amber-200/90 mb-1">
                      ⏰ Data entro cui sollecitare
                    </label>
                    <input
                      type="date"
                      value={followUpDueDate}
                      onChange={(e) => setFollowUpDueDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* 5. PROSSIMA AZIONE DA FARE + CHECKLIST PASSAGGI SUL PROGETTO */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                    <span>➡️ Prossima Azione da Fare (Cosa resta da fare dopo)</span>
                  </label>
                  <input
                    type="text"
                    value={nextActionToDo}
                    onChange={(e) => setNextActionToDo(e.target.value)}
                    placeholder="Es. Appena confermano gli orari, caricare programma su supervisore e fare test..."
                    className="w-full bg-slate-800 border border-emerald-600/40 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Sotto-azioni / Checklist */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Checklist Azioni da Fare ({actionSteps.length})</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Facoltativa — spuntabile sulla scheda</span>
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
                      placeholder="Aggiungi punto elenco (es. Test Linea 1, Backup file) e premi Invio..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddActionStep}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Aggiungi</span>
                    </button>
                  </div>

                  {actionSteps.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 pt-1">
                      {actionSteps.map((step, idx) => (
                        <div
                          key={step.id}
                          className={`flex items-center gap-2 bg-slate-900 border px-2.5 py-1.5 rounded-lg text-xs transition ${
                            step.completed
                              ? 'border-emerald-700/50 bg-emerald-950/20'
                              : 'border-indigo-500/40'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleActionStepModal(step.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition ${
                              step.completed
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                                : 'border-slate-600 hover:border-indigo-400 text-transparent'
                            }`}
                            title="Spunta come completata"
                          >
                            ✓
                          </button>
                          <strong className="text-indigo-400 font-mono shrink-0">#{idx + 1}</strong>
                          <input
                            type="text"
                            autoFocus={focusStepId === step.id}
                            value={step.text}
                            onChange={(e) => handleUpdateActionStepText(step.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddActionStep();
                              }
                            }}
                            placeholder={`Scrivi qui l'azione #${idx + 1} da fare...`}
                            className={`flex-1 bg-transparent border-none text-xs focus:outline-none ${
                              step.completed ? 'line-through text-slate-400' : 'text-white placeholder-slate-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveActionStep(step.id)}
                            className="text-slate-500 hover:text-rose-400 p-0.5 shrink-0"
                            title="Rimuovi punto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* =====================================================================
               MODULO STANDARD PER "INTERVENTI & GUASTI" (ASSISTENZA / DIFETTI)
               ===================================================================== */
            <>
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
                    <span className="text-[10px] text-slate-500">JPG, PNG, WEBP (or press Ctrl+V)</span>
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
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {isProjectWork ? 'Annulla' : 'Cancel'}
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition shadow-lg active:scale-95 flex items-center gap-1.5 ${
                isProjectWork
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/25'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isProjectWork ? 'Salva nel Tracking Lavori Progetto' : 'Submit Service Request'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
