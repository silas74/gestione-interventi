import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  FileDown,
  MessageCircle,
  Camera,
  Upload,
  Clipboard,
  Trash2,
  Mic,
  MicOff,
  LogIn,
  LogOut,
  Wrench,
  ArrowRight,
  AlertTriangle,
  Package,
  RotateCcw,
  Pencil,
  CheckSquare,
  Square,
  ShoppingCart,
  Globe,
  Sparkles,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { DailySiteReport, DefectPhoto, Project, InterventionRequest, PdfLanguage } from '../types';
import { compressAndProcessImage, extractImagesFromClipboard, readClipboardImagesAsync } from '../lib/photoUtils';
import { downloadDailySiteReportPDF, shareDailySiteReportViaWhatsApp } from '../lib/pdfGenerator';
import { formatRawNotesWithAi, translateDailyReportFieldsWithAi } from '../lib/aiService';
import { SignaturePad } from './SignaturePad';
import { PhotoAnnotatorModal } from './PhotoAnnotatorModal';

interface DailySiteReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  defaultProjectId: string;
  currentUserName: string;
  existingReport?: DailySiteReport | null;
  allDailyReports?: DailySiteReport[];
  projectInterventions?: InterventionRequest[];
  totalExistingCount: number;
  onSave: (report: DailySiteReport, completedTaskIds?: string[], newMissingMaterialText?: string) => void;
  onOpenAiSettings?: () => void;
}

const AWASH_QUICK_ZONES = [
  'Parking area LPR',
  'Parking area CO',
  'Solar system',
  'CCTV',
  'Main Power',
];

export function calculateNetHours(arrival: string, departure: string, breakMins: number): number | null {
  if (!arrival || !departure) return null;
  const [arrH, arrM] = arrival.split(':').map(Number);
  const [depH, depM] = departure.split(':').map(Number);
  if (isNaN(arrH) || isNaN(arrM) || isNaN(depH) || isNaN(depM)) return null;

  let startMinutes = arrH * 60 + arrM;
  let endMinutes = depH * 60 + depM;
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  const netMinutes = Math.max(0, endMinutes - startMinutes - (Number(breakMins) || 0));
  return Math.round((netMinutes / 60) * 100) / 100;
}

export function formatHoursAndMinutes(
  hoursDecimal: number,
  arrival?: string,
  departure?: string,
  breakMins = 0
): string {
  if (arrival && departure) {
    const [arrH, arrM] = arrival.split(':').map(Number);
    const [depH, depM] = departure.split(':').map(Number);
    if (!isNaN(arrH) && !isNaN(arrM) && !isNaN(depH) && !isNaN(depM)) {
      let startM = arrH * 60 + arrM;
      let endM = depH * 60 + depM;
      if (endM < startM) endM += 24 * 60;
      const netM = Math.max(0, endM - startM - (Number(breakMins) || 0));
      const h = Math.floor(netM / 60);
      const m = netM % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
  }
  const totalMins = Math.round((Number(hoursDecimal) || 0) * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const DailySiteReportModal: React.FC<DailySiteReportModalProps> = ({
  isOpen,
  onClose,
  projects,
  defaultProjectId,
  currentUserName,
  existingReport,
  allDailyReports = [],
  projectInterventions = [],
  totalExistingCount,
  onSave,
  onOpenAiSettings,
}) => {
  if (!isOpen) return null;

  const initialProjId =
    existingReport?.projectId ||
    (defaultProjectId && defaultProjectId !== 'all' ? defaultProjectId : 'proj-awash-bank');

  const [projectId, setProjectId] = useState<string>(initialProjId);
  const [date, setDate] = useState<string>(
    existingReport?.date || new Date().toISOString().split('T')[0]
  );
  const [technicianName, setTechnicianName] = useState<string>(
    existingReport?.technicianName || currentUserName || 'Pierluigi'
  );
  const [arrivalTime, setArrivalTime] = useState<string>(
    existingReport?.arrivalTime || '08:30'
  );
  const [departureTime, setDepartureTime] = useState<string>(
    existingReport?.departureTime || '17:30'
  );
  const [breakMinutes, setBreakMinutes] = useState<number>(
    existingReport?.breakMinutes !== undefined ? existingReport.breakMinutes : 0
  );
  const [hoursWorked, setHoursWorked] = useState<number>(
    existingReport?.hoursWorked !== undefined ? existingReport.hoursWorked : 9
  );
  const [areaOrFloor, setAreaOrFloor] = useState<string>(
    existingReport?.areaOrFloor || ''
  );
  const [workDone, setWorkDone] = useState<string>(
    existingReport?.workDone || ''
  );
  const [materialsUsed, setMaterialsUsed] = useState<string>(
    existingReport?.materialsUsed || ''
  );
  const [missingMaterials, setMissingMaterials] = useState<string>(
    existingReport?.missingMaterials || ''
  );
  const [issuesFound, setIssuesFound] = useState<string>(
    existingReport?.issuesFound || ''
  );
  const [nextDayPlan, setNextDayPlan] = useState<string>(
    existingReport?.nextDayPlan || ''
  );
  const [photos, setPhotos] = useState<DefectPhoto[]>(
    existingReport?.photos || []
  );
  const [technicianSignature, setTechnicianSignature] = useState<string>(
    existingReport?.technicianSignature || ''
  );
  const [clientSignerName, setClientSignerName] = useState<string>(
    existingReport?.clientSignerName || ''
  );
  const [clientSignature, setClientSignature] = useState<string>(
    existingReport?.clientSignature || ''
  );

  // Feature 3: Automatic Timestamp + Zone Watermark on photos
  const [autoStampWatermark, setAutoStampWatermark] = useState<boolean>(true);
  // Feature 2: Photo Annotator state
  const [annotatingPhoto, setAnnotatingPhoto] = useState<DefectPhoto | null>(null);
  // Feature 4: Checked project actions done today
  const [checkedTaskIds, setCheckedTaskIds] = useState<string[]>(
    existingReport?.completedActionIds || []
  );
  // Feature 5: PDF Language ('it' | 'en')
  const [pdfLang, setPdfLang] = useState<PdfLanguage>('it');

  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRunningAi, setIsRunningAi] = useState(false);
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Feature A: Structure raw notes into a technical report using DeepSeek / Local Ollama
  const handleFormatNotesWithAi = async (targetLang: PdfLanguage) => {
    if (!workDone.trim()) {
      alert('Scrivi o detta prima qualche appunto in "Cose Fatte Oggi" per farlo strutturare dall\'AI.');
      return;
    }
    setIsRunningAi(true);
    setAiErrorMsg(null);
    try {
      const res = await formatRawNotesWithAi({
        rawNotes: workDone,
        projectName: selectedProjObj ? selectedProjObj.name : 'Awash Bank',
        areaOrFloor,
        existingMaterials: materialsUsed,
        existingIssues: issuesFound,
        existingMissing: missingMaterials,
        existingNextPlan: nextDayPlan,
        targetLang,
      });
      if (res.workDone) setWorkDone(res.workDone);
      if (res.materialsUsed) setMaterialsUsed(res.materialsUsed);
      if (res.issuesFound) setIssuesFound(res.issuesFound);
      if (res.missingMaterials) setMissingMaterials(res.missingMaterials);
      if (res.nextDayPlan) setNextDayPlan(res.nextDayPlan);
      setPdfLang(targetLang);
    } catch (err: any) {
      setAiErrorMsg(err?.message || 'Errore AI.');
    } finally {
      setIsRunningAi(false);
    }
  };

  // Feature B: Translate all fields & photo captions into English (or Italian)
  const handleTranslateReportWithAi = async (targetLang: PdfLanguage) => {
    if (!workDone.trim()) {
      alert('Compila prima "Cose Fatte Oggi" per tradurre il report.');
      return;
    }
    setIsRunningAi(true);
    setAiErrorMsg(null);
    try {
      const res = await translateDailyReportFieldsWithAi({
        areaOrFloor,
        workDone,
        materialsUsed,
        issuesFound,
        missingMaterials,
        nextDayPlan,
        photoCaptions: photos.map((p) => p.caption || ''),
        targetLang,
      });
      if (res.areaOrFloor !== undefined) setAreaOrFloor(res.areaOrFloor);
      if (res.workDone) setWorkDone(res.workDone);
      if (res.materialsUsed !== undefined) setMaterialsUsed(res.materialsUsed);
      if (res.issuesFound !== undefined) setIssuesFound(res.issuesFound);
      if (res.missingMaterials !== undefined) setMissingMaterials(res.missingMaterials);
      if (res.nextDayPlan !== undefined) setNextDayPlan(res.nextDayPlan);
      if (Array.isArray(res.photoCaptions) && res.photoCaptions.length === photos.length) {
        setPhotos((prev) =>
          prev.map((p, idx) => ({
            ...p,
            caption: res.photoCaptions[idx] ?? p.caption,
          }))
        );
      }
      setPdfLang(targetLang);
    } catch (err: any) {
      setAiErrorMsg(err?.message || 'Errore traduzione AI.');
    } finally {
      setIsRunningAi(false);
    }
  };

  useEffect(() => {
    const computed = calculateNetHours(arrivalTime, departureTime, breakMinutes);
    if (computed !== null && computed >= 0) {
      setHoursWorked(computed);
    }
  }, [arrivalTime, departureTime, breakMinutes]);

  const getCurrentTimeHHMM = () => new Date().toTimeString().slice(0, 5);

  const selectedProjObj = projects.find((p) => p.id === projectId) || projects[0];

  // Feature 1: Find the most recent previous report for this project ("Riprendi da Ieri")
  const previousProjectReport = allDailyReports
    .filter((r) => r.projectId === projectId && r.id !== existingReport?.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

  const handleCopyFromYesterday = () => {
    if (!previousProjectReport) {
      alert('Nessun report precedente trovato per questo progetto.');
      return;
    }
    if (previousProjectReport.areaOrFloor) {
      setAreaOrFloor(previousProjectReport.areaOrFloor);
    }
    if (previousProjectReport.technicianName) {
      setTechnicianName(previousProjectReport.technicianName);
    }
    if (previousProjectReport.clientSignerName) {
      setClientSignerName(previousProjectReport.clientSignerName);
    }
    const carryOverWork =
      previousProjectReport.nextDayPlan?.trim() || previousProjectReport.workDone?.trim() || '';
    if (carryOverWork) {
      setWorkDone((prev) =>
        prev.trim() ? `${prev.trim()}\n${carryOverWork}` : carryOverWork
      );
    }
    if (previousProjectReport.missingMaterials && !missingMaterials.trim()) {
      setMissingMaterials(previousProjectReport.missingMaterials);
    }
  };

  // Feature 4: Toggle an open project task/action as done today
  const openProjectTasks = projectInterventions.filter(
    (item) =>
      item.projectId === projectId &&
      item.status !== 'completed' &&
      item.status !== 'completato'
  );

  const handleToggleProjectStepToday = (
    task: InterventionRequest,
    stepId: string,
    stepText: string
  ) => {
    const compositeId = `${task.id}::${stepId}`;
    const isAlreadyChecked = checkedTaskIds.includes(compositeId);

    // Infer short system label & quick zone
    const titleLower = task.title.toLowerCase();
    let sysTag = task.code;
    let autoZone = '';
    if (titleLower.includes('cctv')) {
      sysTag = 'CCTV';
      autoZone = 'CCTV';
    } else if (titleLower.includes('solar')) {
      sysTag = 'Solar System';
      autoZone = 'Solar system';
    } else if (titleLower.includes('parking') && titleLower.includes('lpr')) {
      sysTag = 'Parking LPR';
      autoZone = 'Parking area LPR';
    } else if (titleLower.includes('co ')) {
      sysTag = 'Parking CO';
      autoZone = 'Parking area CO';
    }

    if (isAlreadyChecked) {
      setCheckedTaskIds((prev) => prev.filter((id) => id !== compositeId));
    } else {
      setCheckedTaskIds((prev) => [...prev, compositeId]);
      const bulletLine = `• [${sysTag}] ${stepText}`;
      setWorkDone((prev) => {
        if (prev.includes(stepText)) return prev;
        return prev.trim() ? `${prev.trim()}\n${bulletLine}` : bulletLine;
      });
      if (autoZone) {
        setAreaOrFloor((prev) =>
          prev.trim()
            ? prev.includes(autoZone)
              ? prev
              : `${prev.trim()} | ${autoZone}`
            : autoZone
        );
      }
    }
  };

  const buildWatermarkString = () => {
    const projName = selectedProjObj ? selectedProjObj.name : 'Awash Bank';
    const zoneStr = areaOrFloor.trim() ? ` • ${areaOrFloor.trim()}` : '';
    const timeNow = getCurrentTimeHHMM();
    return `${projName}${zoneStr} • ${date} ${timeNow}`;
  };

  const handleAddPhotos = async (files: (File | Blob)[], sourceLabel?: string) => {
    if (!files || files.length === 0) return;
    setIsProcessingPhotos(true);
    try {
      const processed: DefectPhoto[] = [];
      const stampText = autoStampWatermark ? buildWatermarkString() : undefined;
      for (let i = 0; i < files.length; i++) {
        const defaultName = sourceLabel ? `${sourceLabel}_${i + 1}.jpg` : undefined;
        const photo = await compressAndProcessImage(
          files[i],
          defaultName,
          1280,
          0.84,
          stampText
        );
        processed.push({
          ...photo,
          caption: areaOrFloor.trim() ? `${areaOrFloor.trim()}` : '',
        });
      }
      setPhotos((prev) => [...prev, ...processed]);
    } catch (err) {
      console.error('Error processing photos', err);
      alert('Errore durante il caricamento delle foto.');
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddPhotos(Array.from(e.target.files), 'cantiere');
      e.target.value = '';
    }
  };

  const handlePasteFromClipboardBtn = async () => {
    try {
      const images = await readClipboardImagesAsync();
      if (images.length > 0) {
        await handleAddPhotos(images, 'cantiere_incollata');
      } else {
        alert('Nessuna immagine negli appunti. Copia una foto e premi Ctrl+V!');
      }
    } catch {
      alert('Premi Ctrl+V sulla tastiera per incollare una foto dagli appunti.');
    }
  };

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (annotatingPhoto) return;
      const images = extractImagesFromClipboard(e.clipboardData);
      if (images.length > 0) {
        e.preventDefault();
        handleAddPhotos(images, 'cantiere_incollata');
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [annotatingPhoto, autoStampWatermark, areaOrFloor, date, projectId]);

  const handleUpdatePhotoCaption = (photoId: string, caption: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, caption } : p))
    );
  };

  const handleSaveAnnotatedPhoto = (photoId: string, newDataUrl: string, newCaption?: string) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId
          ? { ...p, url: newDataUrl, caption: newCaption !== undefined ? newCaption : p.caption }
          : p
      )
    );
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const toggleVoiceDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Riconoscimento vocale non supportato in questo browser. Usa Chrome, Edge o Safari.');
      return;
    }

    if (isRecordingVoice) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsRecordingVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'it-IT';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onstart = () => setIsRecordingVoice(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        const trimmed = transcript.trim();
        if (trimmed) {
          setWorkDone((prev) => (prev.trim() ? `${prev.trim()} ${trimmed}.` : `${trimmed}.`));
        }
      };
      recognition.onerror = () => setIsRecordingVoice(false);
      recognition.onend = () => setIsRecordingVoice(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecordingVoice(false);
    }
  };

  const buildReportObject = (): DailySiteReport => {
    const projCode = selectedProjObj ? selectedProjObj.code.toUpperCase() : 'AWASH';
    const seq = String(totalExistingCount + 1).padStart(3, '0');
    const nowIso = new Date().toISOString();

    return {
      id: existingReport?.id || `day-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: existingReport?.code || `DAY-${projCode}-${seq}`,
      projectId: selectedProjObj ? selectedProjObj.id : projectId,
      projectName: selectedProjObj ? selectedProjObj.name : 'Awash Bank',
      date,
      technicianName: technicianName.trim() || 'Pierluigi',
      arrivalTime,
      departureTime,
      breakMinutes: Number(breakMinutes) || 0,
      hoursWorked: Number(hoursWorked) || 0,
      areaOrFloor: areaOrFloor.trim() || undefined,
      workDone: workDone.trim() || 'Ispezione tecnica, verifiche impianti e lavori in cantiere.',
      materialsUsed: materialsUsed.trim() || undefined,
      missingMaterials: missingMaterials.trim() || undefined,
      issuesFound: issuesFound.trim() || undefined,
      nextDayPlan: nextDayPlan.trim() || undefined,
      completedActionIds: checkedTaskIds.length > 0 ? checkedTaskIds : undefined,
      photos,
      technicianSignature: technicianSignature || undefined,
      clientSignerName: clientSignerName.trim() || undefined,
      clientSignature: clientSignature || undefined,
      createdAt: existingReport?.createdAt || nowIso,
      updatedAt: nowIso,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workDone.trim()) {
      alert('Inserisci le cose fatte oggi in cantiere prima di salvare.');
      return;
    }
    const reportObj = buildReportObject();
    onSave(reportObj, checkedTaskIds, missingMaterials.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2 flex-wrap">
                <span>Report Giornaliero di Cantiere</span>
                {existingReport && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-600/50">
                    {existingReport.code}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300">
                Orario arrivo/uscita, lavori svolti, foto annotate con timbro e PDF Italiano/Inglese
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Feature 1: Riprendi da Ieri */}
            {previousProjectReport && (
              <button
                type="button"
                onClick={handleCopyFromYesterday}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 text-xs font-bold transition active:scale-95"
                title={`Copia Zona e Programma dal report del ${previousProjectReport.date}`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>🔄 Riprendi da Ieri ({previousProjectReport.date})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Row 1: Progetto, Data Giornata, Tecnico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Progetto / Cantiere *
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-yellow-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                📅 Data Giornata *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                👷 Tecnico in Cantiere *
              </label>
              <input
                type="text"
                required
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="Es. Pierluigi / Costantino"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Row 2: ORARIO DI ARRIVO E PARTENZA DAL CANTIERE + PAUSA + ORE TOTALI */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-600/50 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>ORARIO DI ARRIVO E PARTENZA DAL CANTIERE</span>
              </span>
              <span className="text-[11px] text-slate-300">
                Usa i pulsanti <strong className="text-white">"📍 Ora"</strong> e <strong className="text-white">"🏁 Ora"</strong> in cantiere
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Ora Arrivo */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-700/50">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                    <LogIn className="w-3 h-3 text-emerald-400" />
                    <span>Ora Arrivo *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setArrivalTime(getCurrentTimeHHMM())}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95"
                    title="Imposta l'orario attuale come ora di arrivo"
                  >
                    📍 Ora
                  </button>
                </div>
                <input
                  type="time"
                  required
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Ora Partenza */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-amber-700/50">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                    <LogOut className="w-3 h-3 text-amber-400" />
                    <span>Ora Partenza *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setDepartureTime(getCurrentTimeHHMM())}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-95"
                    title="Imposta l'orario attuale come ora di uscita dal cantiere"
                  >
                    🏁 Ora
                  </button>
                </div>
                <input
                  type="time"
                  required
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Pausa pranzo */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  ☕ Pausa (minuti)
                </label>
                <select
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-blue-400"
                >
                  <option value={0}>0 min (Nessuna)</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min (1 ora)</option>
                  <option value={90}>90 min (1.5 ore)</option>
                </select>
              </div>

              {/* Totale Ore Lavorate */}
              <div className="bg-blue-950/40 p-2.5 rounded-xl border border-blue-500/50">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-blue-300">
                    ⏱️ Durata Cantiere
                  </label>
                  <span className="text-[11px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-400/40">
                    {formatHoursAndMinutes(hoursWorked, arrivalTime, departureTime, breakMinutes)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="24"
                    required
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-blue-500/60 rounded-lg px-2 py-1.5 text-sm font-mono font-extrabold text-yellow-300 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-blue-300">ore</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Zona / Piano / Impianto in Cantiere */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Zona / Piano / Impianto in Cantiere (opz.)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {AWASH_QUICK_ZONES.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() =>
                    setAreaOrFloor((prev) =>
                      prev.trim()
                        ? prev.includes(z)
                          ? prev
                          : `${prev.trim()} | ${z}`
                        : z
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-blue-600/30 text-slate-200 hover:text-blue-200 border border-slate-700 transition"
                >
                  + {z}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={areaOrFloor}
              onChange={(e) => setAreaOrFloor(e.target.value)}
              placeholder="Es. Parking area LPR, Parking area CO, Solar system, CCTV, Main Power..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Feature 4: Spunta le Azioni / Step del Progetto fatte oggi (CCTV, Solar System, Parking System, CO...) */}
          {openProjectTasks.length > 0 && (
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-700/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-indigo-300 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  <span>
                    ✅ Spunta le Attività di {selectedProjObj?.name} fatte oggi (le scrive da solo nel report e aggiorna l'avanzamento):
                  </span>
                </span>
                {checkedTaskIds.length > 0 && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {checkedTaskIds.length} selezionate oggi
                  </span>
                )}
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {openProjectTasks.map((task) => {
                  const steps = task.actionSteps || [];
                  const openSteps = steps.filter((s) => !s.completed);
                  const doneCount = steps.filter((s) => s.completed).length;

                  return (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200 border border-indigo-700/50">
                            {task.code}
                          </span>
                          <span>{task.title}</span>
                        </div>
                        {steps.length > 0 && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {doneCount}/{steps.length} completati
                          </span>
                        )}
                      </div>

                      {openSteps.length > 0 ? (
                        <div className="grid grid-cols-1 gap-1 pt-1">
                          {openSteps.map((step) => {
                            const compositeId = `${task.id}::${step.id}`;
                            const isChecked = checkedTaskIds.includes(compositeId);
                            return (
                              <div
                                key={step.id}
                                onClick={() =>
                                  handleToggleProjectStepToday(task, step.id, step.text)
                                }
                                className={`p-2 rounded-lg border text-xs cursor-pointer flex items-start gap-2 transition ${
                                  isChecked
                                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 font-semibold'
                                    : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 text-slate-200'
                                }`}
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                )}
                                <span className="leading-snug">{step.text}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          onClick={() =>
                            handleToggleProjectStepToday(task, 'MAIN', task.title)
                          }
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-start gap-2 transition ${
                            checkedTaskIds.includes(`${task.id}::MAIN`)
                              ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 font-semibold'
                              : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/50 text-slate-200'
                          }`}
                        >
                          {checkedTaskIds.includes(`${task.id}::MAIN`) ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          )}
                          <span>Segna intera attività come eseguita oggi</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 4: Cose fatte oggi in cantiere + AI Action Bar (Feature A & Feature B) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-yellow-400" />
                <span>Cose Fatte Oggi in Cantiere (Lavori Eseguiti) *</span>
              </label>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Voice Dictation */}
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                    isRecordingVoice
                      ? 'bg-rose-600 text-white animate-pulse shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isRecordingVoice ? (
                    <MicOff className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  <span>{isRecordingVoice ? 'In ascolto...' : '🎤 Detta a Voce'}</span>
                </button>

                {/* Feature A: Format raw notes into structured technical report (IT) */}
                <button
                  type="button"
                  disabled={isRunningAi}
                  onClick={() => handleFormatNotesWithAi('it')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/50 text-xs font-bold transition active:scale-95 disabled:opacity-50"
                  title="Trasforma i tuoi appunti veloci in una relazione tecnica strutturata (Lavori, Materiali, Problemi e Programma Domani)"
                >
                  {isRunningAi ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-300" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  )}
                  <span>✨ Formatta Appunti (AI)</span>
                </button>

                {/* Feature B: Translate to Technical English for Addis Client */}
                <button
                  type="button"
                  disabled={isRunningAi}
                  onClick={() => handleTranslateReportWithAi('en')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-400/50 text-xs font-bold transition active:scale-95 disabled:opacity-50"
                  title="Traduci automaticamente Lavori, Note, Programma e Didascalie Foto in Inglese Tecnico per il PDF EN"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>🇬🇧 Traduci in Inglese (AI)</span>
                </button>

                {onOpenAiSettings && (
                  <button
                    type="button"
                    onClick={onOpenAiSettings}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    title="Impostazioni AI (DeepSeek API / Ollama Locale)"
                  >
                    <Settings className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                )}
              </div>
            </div>

            {aiErrorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200 flex items-center justify-between gap-2">
                <span>{aiErrorMsg}</span>
                {onOpenAiSettings && (
                  <button
                    type="button"
                    onClick={onOpenAiSettings}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shrink-0"
                  >
                    Configura DeepSeek / Ollama
                  </button>
                )}
              </div>
            )}

            <textarea
              required
              rows={4}
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              placeholder="Scrivi o detta a voce anche solo appunti veloci (es. 'configurato 20 telecamere, 2 non prendevano PoE sullo switch 3, domani finisco NVR') e premi '✨ Formatta Appunti (AI)' o '🇬🇧 Traduci in Inglese (AI)'!"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          {/* Row 5: Materiali Usati + Materiali Mancanti (Feature 6) + Problemi + Programma Domani */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-sky-300 mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-sky-400" />
                <span>Materiali Installati / Usati Oggi</span>
              </label>
              <textarea
                rows={2}
                value={materialsUsed}
                onChange={(e) => setMaterialsUsed(e.target.value)}
                placeholder="Es. 4x Sensori CO, 50m cavo schermato, morsetti..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            {/* Feature 6: Materiali Mancanti / Da Comprare Domani */}
            <div>
              <label className="block text-xs font-bold text-rose-300 mb-1 flex items-center gap-1">
                <ShoppingCart className="w-3.5 h-3.5 text-rose-400" />
                <span>🛒 Materiali Mancanti / Da Comprare per Cantiere</span>
              </label>
              <textarea
                rows={2}
                value={missingMaterials}
                onChange={(e) => setMissingMaterials(e.target.value)}
                placeholder="Es. Mancano 2 alimentatori 24V, tasselli M8, 20m cavo cat6..."
                className="w-full bg-slate-800/90 border border-rose-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Problemi / Note Cantiere</span>
              </label>
              <textarea
                rows={2}
                value={issuesFound}
                onChange={(e) => setIssuesFound(e.target.value)}
                placeholder="Es. Mancanza tensione su quadro P2, tubazione ostruita..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-300 mb-1 flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>Programma per Domani (verrà ripreso domani!)</span>
              </label>
              <textarea
                rows={2}
                value={nextDayPlan}
                onChange={(e) => setNextDayPlan(e.target.value)}
                placeholder="Es. Completare cablaggio zona Nord e avvio test LPR..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Row 6: FOTO DEL GIORNO CON TIMBRO AUTOMATICO E DISEGNO/ANNOTAZIONE */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-blue-500/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                    <span>📸 Foto del Lavoro Fatto Oggi in Cantiere</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {photos.length} foto
                    </span>
                  </h4>
                  <label className="flex items-center gap-1.5 text-[11px] text-emerald-300 cursor-pointer mt-0.5">
                    <input
                      type="checkbox"
                      checked={autoStampWatermark}
                      onChange={(e) => setAutoStampWatermark(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    <span>🕒 Imprimi automaticamente Timbro Data + Ora + Zona sulle foto caricate</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Camera direct capture */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scatta Foto</span>
                </button>

                {/* File upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/25 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40 text-xs font-semibold transition active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  <span>Galleria / File</span>
                </button>

                {/* Paste Ctrl+V */}
                <button
                  type="button"
                  onClick={handlePasteFromClipboardBtn}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95"
                >
                  <Clipboard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Incolla</span>
                </button>
              </div>
            </div>

            {isProcessingPhotos && (
              <div className="text-center py-2 text-xs text-blue-400 animate-pulse">
                Compressione, mantenimento proporzioni e timbro orario in corso...
              </div>
            )}

            {photos.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-400">
                Nessuna foto allegata per oggi. Premi <strong>"Scatta Foto"</strong> o <strong>"Galleria / File"</strong> per documentare i lavori eseguiti in cantiere.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 flex flex-col"
                  >
                    <div className="relative aspect-video bg-slate-950 flex items-center justify-center">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="max-w-full max-h-full w-auto h-auto object-contain"
                      />
                      <span className="absolute top-1.5 left-1.5 bg-black/75 text-[10px] font-mono font-bold text-white px-2 py-0.5 rounded border border-white/20">
                        Foto #{idx + 1}
                      </span>

                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                        {/* Feature 2: Annotate / Draw on photo */}
                        <button
                          type="button"
                          onClick={() => setAnnotatingPhoto(photo)}
                          className="px-2 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-[10px] font-extrabold shadow flex items-center gap-1"
                          title="Disegna cerchi, frecce o testo sulla foto"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Segna</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          className="p-1 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white shadow"
                          title="Rimuovi foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-2">
                      <input
                        type="text"
                        value={photo.caption || ''}
                        onChange={(e) => handleUpdatePhotoCaption(photo.id, e.target.value)}
                        placeholder={`Didascalia foto #${idx + 1} (es. Quadro cablato)...`}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Row 7: Firme Digitali (Tecnico + Referente Cantiere opz.) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div>
              <SignaturePad
                label="Firma Tecnico (Pierluigi / Costantino)"
                initialSignature={technicianSignature}
                onChange={setTechnicianSignature}
              />
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Referente Cantiere / Cliente per presa visione (opz.)
                </label>
                <input
                  type="text"
                  value={clientSignerName}
                  onChange={(e) => setClientSignerName(e.target.value)}
                  placeholder="Es. Ing. Dodic / Site Manager Awash..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
              <SignaturePad
                label="Firma Referente Cantiere (opz.)"
                initialSignature={clientSignature}
                onChange={setClientSignature}
              />
            </div>
          </div>

          {/* Footer Actions with PDF Language Switcher (Feature 5) */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Feature 5: Language Toggle */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-700">
                <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
                <button
                  type="button"
                  onClick={() => setPdfLang('it')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    pdfLang === 'it'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🇮🇹 PDF IT
                </button>
                <button
                  type="button"
                  onClick={() => setPdfLang('en')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition ${
                    pdfLang === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🇬🇧 PDF EN
                </button>
              </div>

              <button
                type="button"
                onClick={() => downloadDailySiteReportPDF(buildReportObject(), pdfLang)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                <FileDown className="w-4 h-4 text-blue-400" />
                <span>Scarica PDF ({pdfLang.toUpperCase()})</span>
              </button>

              <button
                type="button"
                onClick={() => shareDailySiteReportViaWhatsApp(buildReportObject(), pdfLang)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-600/50 transition"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp ({pdfLang.toUpperCase()})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/40 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salva Report Giornaliero</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Feature 2: Photo Annotator Modal */}
      {annotatingPhoto && (
        <PhotoAnnotatorModal
          photo={annotatingPhoto}
          defaultWatermarkText={buildWatermarkString()}
          onClose={() => setAnnotatingPhoto(null)}
          onSaveAnnotated={handleSaveAnnotatedPhoto}
        />
      )}
    </div>
  );
};
