import React, { useState, useRef, useEffect } from 'react';
import { 
  X, CheckCircle2, Clock, Wrench, FileDown, AlertCircle, 
  PhoneCall, MessageCircle, Share2, Tag, Mic, MicOff,
  Camera, Upload, Clipboard, Trash2, Image as ImageIcon
} from 'lucide-react';
import { InterventionRequest, InterventionStatus, TechnicianReport, DefectPhoto } from '../types';
import { downloadInterventionPDF, getInterventionPDFDataUri, shareInterventionPDFViaWhatsApp } from '../lib/pdfGenerator';
import { SignaturePad } from './SignaturePad';
import { getTelUri, getClientWhatsAppUri } from '../lib/contactUtils';
import { COMMON_MATERIALS } from '../lib/materialsData';
import { compressAndProcessImage, extractImagesFromClipboard, readClipboardImagesAsync } from '../lib/photoUtils';

interface TechnicianReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervention: InterventionRequest | null;
  onSaveReport: (interventionId: string, report: TechnicianReport) => void;
  currentTechnicianName: string;
}

export const TechnicianReportModal: React.FC<TechnicianReportModalProps> = ({
  isOpen,
  onClose,
  intervention,
  onSaveReport,
  currentTechnicianName,
}) => {
  if (!isOpen || !intervention) return null;

  const existingReport = intervention.report;

  const [technicianName, setTechnicianName] = useState(
    existingReport?.technicianName || currentTechnicianName || 'Costantino'
  );
  const [interventionDate, setInterventionDate] = useState(
    existingReport?.interventionDate || new Date().toISOString().split('T')[0]
  );
  const [hoursWorked, setHoursWorked] = useState<number>(
    existingReport?.hoursWorked ?? 2
  );
  const [workDone, setWorkDone] = useState(
    existingReport?.workDone || ''
  );
  const [materialsUsed, setMaterialsUsed] = useState(
    existingReport?.materialsUsed || ''
  );
  const [technicalNotes, setTechnicalNotes] = useState(
    existingReport?.technicalNotes || ''
  );
  const [statusOutcome, setStatusOutcome] = useState<'resolved' | 'partial' | 'waiting_for_parts'>(
    (existingReport?.statusOutcome as any) === 'risolto' ? 'resolved' :
    (existingReport?.statusOutcome as any) === 'parziale' ? 'partial' :
    (existingReport?.statusOutcome as any) === 'in_attesa_ricambi' ? 'waiting_for_parts' :
    (existingReport?.statusOutcome as any) || 'resolved'
  );
  const [technicianSignature, setTechnicianSignature] = useState<string>(
    existingReport?.technicianSignature || ''
  );

  // Report Photos State (Upload, Camera & Paste Ctrl+V)
  const [reportPhotos, setReportPhotos] = useState<DefectPhoto[]>(
    existingReport?.reportPhotos || []
  );
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleAddPhotos = async (files: (File | Blob)[], sourceLabel?: string) => {
    if (!files || files.length === 0) return;
    setIsProcessingPhotos(true);
    try {
      const processedList: DefectPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const defaultName = sourceLabel ? `${sourceLabel}_${i + 1}.jpg` : undefined;
        const photo = await compressAndProcessImage(file, defaultName);
        processedList.push(photo);
      }
      setReportPhotos(prev => [...prev, ...processedList]);
    } catch (err) {
      console.error('Error processing photos', err);
      alert('Si è verificato un errore durante l\'elaborazione delle foto.');
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      handleAddPhotos(filesArray);
      e.target.value = '';
    }
  };

  const handlePasteFromClipboardBtn = async () => {
    try {
      const images = await readClipboardImagesAsync();
      if (images.length > 0) {
        await handleAddPhotos(images, 'foto_incollata');
      } else {
        alert('Nessuna immagine trovata negli appunti. Copia prima una foto o screenshot e poi premi qui o fai Ctrl+V!');
      }
    } catch {
      alert('Per incollare una foto, premi semplicemente Ctrl+V sulla tastiera in qualsiasi punto di questa finestra!');
    }
  };

  const handleRemoveReportPhoto = (id: string) => {
    setReportPhotos(prev => prev.filter(p => p.id !== id));
  };

  // Global Paste listener for the modal window
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      // If typing in textarea/input, check if clipboard contains an image before letting default text paste
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const images = extractImagesFromClipboard(e.clipboardData);
        if (images.length > 0) {
          e.preventDefault();
          handleAddPhotos(images, 'foto_incollata');
        }
        return;
      }

      const images = extractImagesFromClipboard(e.clipboardData);
      if (images.length > 0) {
        e.preventDefault();
        handleAddPhotos(images, 'foto_incollata');
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, []);

  // Speech-to-Text Voice Dictation State
  const [isRecordingWorkDone, setIsRecordingWorkDone] = useState(false);
  const [isRecordingNotes, setIsRecordingNotes] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleVoiceDictation = (field: 'workDone' | 'notes') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or Safari.');
      return;
    }

    if (field === 'workDone' && isRecordingWorkDone) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsRecordingWorkDone(false);
      return;
    }
    if (field === 'notes' && isRecordingNotes) {
      try { recognitionRef.current?.stop(); } catch {}
      setIsRecordingNotes(false);
      return;
    }

    // Stop active instance
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'it-IT';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => {
        if (field === 'workDone') {
          setIsRecordingWorkDone(true);
          setIsRecordingNotes(false);
        } else {
          setIsRecordingNotes(true);
          setIsRecordingWorkDone(false);
        }
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }

        const trimmed = transcript.trim();
        if (trimmed) {
          if (field === 'workDone') {
            setWorkDone(prev => prev.trim() ? `${prev.trim()} ${trimmed}.` : `${trimmed}.`);
          } else {
            setTechnicalNotes(prev => prev.trim() ? `${prev.trim()} ${trimmed}.` : `${trimmed}.`);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecordingWorkDone(false);
        setIsRecordingNotes(false);
      };

      recognition.onend = () => {
        setIsRecordingWorkDone(false);
        setIsRecordingNotes(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Could not start speech recognition:', err);
      setIsRecordingWorkDone(false);
      setIsRecordingNotes(false);
    }
  };

  const handlePreviewPDF = () => {
    const tempReport: TechnicianReport = {
      technicianName,
      interventionDate,
      hoursWorked: Number(hoursWorked),
      workDone: workDone.trim() || 'On-site technical inspection, testing and maintenance performed.',
      materialsUsed: materialsUsed.trim(),
      technicalNotes: technicalNotes.trim(),
      statusOutcome,
      technicianSignature,
      completedAt: new Date().toISOString(),
      reportPhotos,
    };

    const isFinished = statusOutcome === 'resolved' || (statusOutcome as string) === 'risolto';
    const effectiveStatus: InterventionStatus = isFinished ? 'completed' : 'in_progress';

    const tempIntervention: InterventionRequest = {
      ...intervention,
      status: effectiveStatus,
      assignedTechnician: technicianName,
      report: tempReport
    };

    downloadInterventionPDF(tempIntervention);
  };

  const handleShareWhatsAppPDF = async () => {
    const tempReport: TechnicianReport = {
      technicianName,
      interventionDate,
      hoursWorked: Number(hoursWorked),
      workDone: workDone.trim() || 'On-site technical inspection, testing and maintenance performed.',
      materialsUsed: materialsUsed.trim(),
      technicalNotes: technicalNotes.trim(),
      statusOutcome,
      technicianSignature,
      completedAt: new Date().toISOString(),
      reportPhotos,
    };

    const isFinished = statusOutcome === 'resolved' || (statusOutcome as string) === 'risolto';
    const effectiveStatus: InterventionStatus = isFinished ? 'completed' : 'in_progress';

    const tempIntervention: InterventionRequest = {
      ...intervention,
      status: effectiveStatus,
      assignedTechnician: technicianName,
      report: tempReport
    };

    await shareInterventionPDFViaWhatsApp(tempIntervention);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!workDone.trim()) {
      alert('Please enter a description of the work performed on-site.');
      return;
    }

    const report: TechnicianReport = {
      technicianName,
      interventionDate,
      hoursWorked: Number(hoursWorked),
      workDone: workDone.trim(),
      materialsUsed: materialsUsed.trim(),
      technicalNotes: technicalNotes.trim(),
      statusOutcome,
      technicianSignature,
      completedAt: new Date().toISOString(),
      reportPhotos,
    };

    const isFinished = statusOutcome === 'resolved' || (statusOutcome as string) === 'risolto';
    const effectiveStatus: InterventionStatus = isFinished ? 'completed' : 'in_progress';

    // Attach PDF Data URI
    try {
      const tempIntervention: InterventionRequest = {
        ...intervention,
        status: effectiveStatus,
        assignedTechnician: technicianName,
        report
      };
      report.pdfDataUri = getInterventionPDFDataUri(tempIntervention);
    } catch (err) {
      console.warn('PDF data URI generation skipped', err);
    }

    onSaveReport(intervention.id, report);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Technical Execution Report</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50">
                  {intervention.code}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Site: {intervention.siteName} — Client: {intervention.clientName}
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

        {/* Problem Reminder Callout with Quick Call & WhatsApp */}
        <div className="bg-slate-950/80 px-4 sm:px-6 py-2.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Reported Issue / Task: </span>
              <span>{intervention.title} — {intervention.description}</span>
            </div>
          </div>

          {intervention.clientContact && (
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              {getTelUri(intervention.clientContact) && (
                <a
                  href={getTelUri(intervention.clientContact)!}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/35 text-[11px] font-semibold transition active:scale-95 shadow-sm"
                  title={`Call client ${intervention.clientName}`}
                >
                  <PhoneCall className="w-3 h-3 text-blue-400" />
                  <span>Call Client</span>
                </a>
              )}
              <a
                href={getClientWhatsAppUri(intervention)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition active:scale-95 shadow-sm"
                title={`WhatsApp client ${intervention.clientName}`}
              >
                <MessageCircle className="w-3 h-3 text-emerald-400" />
                <span>WhatsApp</span>
              </a>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Technician, Date & Hours Worked */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/50 p-3 sm:p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Technician Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Execution Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={interventionDate}
                onChange={(e) => setInterventionDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Hours Worked <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                required
                value={hoursWorked}
                onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Work Done Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Detailed Description of Work Performed <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => toggleVoiceDictation('workDone')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95 ${
                  isRecordingWorkDone
                    ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-900/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title="Dictate work performed with voice (Speech to Text)"
              >
                {isRecordingWorkDone ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-blue-400" />}
                <span>{isRecordingWorkDone ? 'Listening (Tap to stop)...' : 'Dictate with Voice'}</span>
              </button>
            </div>
            <textarea
              required
              rows={4}
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              placeholder="Specify the exact technical work carried out: inspections, component replacement, calibrations, functional tests... (or tap Dictate with Voice to speak)"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* Replaced Parts and Materials with Quick-Pick Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Replaced Parts & Materials Used (optional)
              </label>
              <span className="text-[10px] text-slate-400">Tap below to add common items</span>
            </div>

            {/* Quick Pick Chips */}
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 mb-2 text-[11px] text-blue-400 font-semibold">
                <Tag className="w-3.5 h-3.5" />
                <span>Quick-Pick Common Spare Parts (Click to add):</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {COMMON_MATERIALS.map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => {
                      setMaterialsUsed(prev => {
                        const trimmed = prev.trim();
                        if (!trimmed) return `1x ${mat.name}`;
                        if (trimmed.includes(mat.name)) return trimmed;
                        return `${trimmed}, 1x ${mat.name}`;
                      });
                    }}
                    className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700/60 transition active:scale-95 flex items-center gap-1.5"
                    title={`Add ${mat.name}`}
                  >
                    <span className="text-blue-400 font-bold">+</span>
                    <span>{mat.name}</span>
                    <span className="text-[9px] px-1 rounded bg-slate-900 text-slate-400 font-mono">
                      {mat.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={materialsUsed}
              onChange={(e) => setMaterialsUsed(e.target.value)}
              placeholder="e.g. 1x KNX 640mA Power Supply, 2x Relay modules 24V, 10m bus cable..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Technical Recommendations */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Technical Recommendations for Client
              </label>
              <button
                type="button"
                onClick={() => toggleVoiceDictation('notes')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95 ${
                  isRecordingNotes
                    ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-900/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title="Dictate recommendations with voice"
              >
                {isRecordingNotes ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-blue-400" />}
                <span>{isRecordingNotes ? 'Listening...' : 'Voice Dictate'}</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="e.g. System operating within nominal limits. Recommended follow-up inspection in 6 months... (or tap Voice Dictate)"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* Outcome Status */}
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Intervention Outcome
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatusOutcome('resolved')}
                className={`p-2 rounded-lg text-xs font-semibold border transition text-center ${
                  statusOutcome === 'resolved'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Resolved
              </button>
              <button
                type="button"
                onClick={() => setStatusOutcome('partial')}
                className={`p-2 rounded-lg text-xs font-semibold border transition text-center ${
                  statusOutcome === 'partial'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Partially Complete
              </button>
              <button
                type="button"
                onClick={() => setStatusOutcome('waiting_for_parts')}
                className={`p-2 rounded-lg text-xs font-semibold border transition text-center ${
                  statusOutcome === 'waiting_for_parts'
                    ? 'bg-pink-600/25 border-pink-500 text-pink-300 shadow-sm shadow-pink-900/30 ring-1 ring-pink-500/40'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Waiting for Parts 🌸
              </button>
            </div>
          </div>

          {/* 📸 REPORT PHOTOS (UPLOAD, CAMERA & PASTE CTRL+V) */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Foto del Lavoro Eseguito (Report Photos)</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {reportPhotos.length} allegate
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Carica file, scatta dalla fotocamera o incolla direttamente con Ctrl+V
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* File picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/40 text-xs font-semibold transition active:scale-95 shadow-sm"
                  title="Carica foto da file"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sfoglia Foto</span>
                </button>

                {/* Mobile Camera Direct Snapshot */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition active:scale-95 shadow-sm"
                  title="Scatta foto con la fotocamera del telefono"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Fotocamera</span>
                </button>

                {/* Paste from clipboard */}
                <button
                  type="button"
                  onClick={handlePasteFromClipboardBtn}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95 shadow-sm"
                  title="Incolla foto dagli appunti o premi Ctrl+V"
                >
                  <Clipboard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Incolla (Ctrl+V)</span>
                </button>
              </div>
            </div>

            {/* Drop / Paste Zone Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleAddPhotos(Array.from(e.dataTransfer.files));
                }
              }}
              className={`p-3 rounded-xl border-2 border-dashed transition text-center flex flex-col items-center justify-center gap-1 ${
                isDraggingOver
                  ? 'border-blue-400 bg-blue-950/40 text-blue-200'
                  : 'border-slate-700/80 bg-slate-900/50 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="text-xs font-medium">
                📋 Trascina qui le immagini o premi <strong className="text-blue-300 font-bold">Ctrl+V</strong> per incollare uno screenshot/foto dagli appunti
              </div>
              <div className="text-[10px] text-slate-500">
                Supporta JPG, PNG, WEBP — Compressione e ottimizzazione automatica
              </div>
            </div>

            {/* Loading Indicator */}
            {isProcessingPhotos && (
              <div className="text-center py-2 text-xs text-blue-400 flex items-center justify-center gap-2 animate-pulse">
                <Upload className="w-4 h-4 animate-bounce" />
                <span>Compressione e caricamento foto in corso...</span>
              </div>
            )}

            {/* Photos Preview Grid */}
            {reportPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {reportPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 aspect-video shadow-md"
                  >
                    <img
                      src={photo.url}
                      alt={photo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    
                    {/* Index badge */}
                    <div className="absolute top-1 left-1 bg-black/70 backdrop-blur-xs text-[9px] font-mono text-white px-1.5 py-0.2 rounded border border-white/20">
                      #{index + 1}
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveReportPhoto(photo.id)}
                      className="absolute top-1 right-1 p-1 rounded-lg bg-rose-600/90 text-white hover:bg-rose-500 opacity-90 group-hover:opacity-100 transition shadow"
                      title="Rimuovi foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1">
                      <p className="text-[10px] text-slate-300 truncate font-mono">
                        {photo.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ✍️ DIGITAL SIGNATURE ON SCREEN (Touch / Penna) */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <SignaturePad
              label="Technician Digital Signature (Sign on screen)"
              initialSignature={technicianSignature}
              onChange={setTechnicianSignature}
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePreviewPDF}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
                title="Generate and download PDF preview with your signature"
              >
                <FileDown className="w-4 h-4 text-blue-400" />
                <span>PDF Preview</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsAppPDF}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 transition active:scale-95"
                title="Share PDF report directly on WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Share PDF (WhatsApp)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-[2] sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-white transition shadow-lg active:scale-95 text-center ${
                  statusOutcome === 'waiting_for_parts'
                    ? 'bg-pink-600 hover:bg-pink-500 shadow-pink-600/30'
                    : statusOutcome === 'partial'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {statusOutcome === 'waiting_for_parts'
                    ? 'Save as Working in Progress (Waiting for Parts)'
                    : statusOutcome === 'partial'
                      ? 'Save as Working in Progress (Partial)'
                      : 'Save & Complete Ticket'}
                </span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
