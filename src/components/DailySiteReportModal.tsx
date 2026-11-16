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
  ChevronDown,
  ChevronUp,
  PenTool,
} from 'lucide-react';
import { DailySiteReport, DefectPhoto, PhotoStage, Project, InterventionRequest, PdfLanguage } from '../types';
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

  // Load saved draft if creating a new report (protects against mobile OS page reload after camera capture)
  const savedDraft = React.useMemo(() => {
    if (existingReport) return null;
    try {
      const raw = localStorage.getItem('interventi_daily_report_draft_v2');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [existingReport]);

  const [projectId, setProjectId] = useState<string>(
    existingReport?.projectId || savedDraft?.projectId || initialProjId
  );
  const [date, setDate] = useState<string>(
    existingReport?.date || savedDraft?.date || new Date().toISOString().split('T')[0]
  );
  const [technicianName, setTechnicianName] = useState<string>(
    existingReport?.technicianName || savedDraft?.technicianName || currentUserName || 'Pierluigi'
  );
  const [arrivalTime, setArrivalTime] = useState<string>(
    existingReport?.arrivalTime || savedDraft?.arrivalTime || '08:30'
  );
  const [departureTime, setDepartureTime] = useState<string>(
    existingReport?.departureTime || savedDraft?.departureTime || '17:30'
  );
  const [breakMinutes, setBreakMinutes] = useState<number>(
    existingReport?.breakMinutes !== undefined
      ? existingReport.breakMinutes
      : savedDraft?.breakMinutes !== undefined
      ? savedDraft.breakMinutes
      : 0
  );
  const [hoursWorked, setHoursWorked] = useState<number>(
    existingReport?.hoursWorked !== undefined
      ? existingReport.hoursWorked
      : savedDraft?.hoursWorked !== undefined
      ? savedDraft.hoursWorked
      : 9
  );
  const [areaOrFloor, setAreaOrFloor] = useState<string>(
    existingReport?.areaOrFloor || savedDraft?.areaOrFloor || ''
  );
  const [workDone, setWorkDone] = useState<string>(
    existingReport?.workDone || savedDraft?.workDone || ''
  );
  const [materialsUsed, setMaterialsUsed] = useState<string>(
    existingReport?.materialsUsed || savedDraft?.materialsUsed || ''
  );
  const [missingMaterials, setMissingMaterials] = useState<string>(
    existingReport?.missingMaterials || savedDraft?.missingMaterials || ''
  );
  const [issuesFound, setIssuesFound] = useState<string>(
    existingReport?.issuesFound || savedDraft?.issuesFound || ''
  );
  const [nextDayPlan, setNextDayPlan] = useState<string>(
    existingReport?.nextDayPlan || savedDraft?.nextDayPlan || ''
  );
  const [photos, setPhotos] = useState<DefectPhoto[]>(
    existingReport?.photos || savedDraft?.photos || []
  );
  const [technicianSignature, setTechnicianSignature] = useState<string>(
    existingReport?.technicianSignature || savedDraft?.technicianSignature || ''
  );
  const [clientSignerName, setClientSignerName] = useState<string>(
    existingReport?.clientSignerName || savedDraft?.clientSignerName || ''
  );
  const [clientSignature, setClientSignature] = useState<string>(
    existingReport?.clientSignature || savedDraft?.clientSignature || ''
  );

  // Feature 3: Automatic Timestamp + Zone Watermark on photos
  const [autoStampWatermark, setAutoStampWatermark] = useState<boolean>(true);
  // Feature 2: Photo Annotator state
  const [annotatingPhoto, setAnnotatingPhoto] = useState<DefectPhoto | null>(null);
  // Feature 4: Checked project actions done today
  const [checkedTaskIds, setCheckedTaskIds] = useState<string[]>(
    existingReport?.completedActionIds || savedDraft?.checkedTaskIds || []
  );
  // Feature 5: PDF Language ('it' | 'en')
  const [pdfLang, setPdfLang] = useState<PdfLanguage>(savedDraft?.pdfLang || 'it');

  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRunningAi, setIsRunningAi] = useState(false);
  const [aiErrorMsg, setAiErrorMsg] = useState<string | null>(null);

  // Clean Mobile-First Tab & Collapsible Drawer State (restores 'photos' tab after mobile camera reload!)
  const [activeTab, setActiveTab] = useState<'main' | 'photos' | 'notes' | 'signatures'>(
    savedDraft?.activeTab || 'main'
  );
  const [isChecklistOpen, setIsChecklistOpen] = useState<boolean>(false);
  const [checklistCategoryFilter, setChecklistCategoryFilter] = useState<string>('ALL');
  const [showTechInput, setShowTechInput] = useState<boolean>(false);

  // In-App Live Camera State (prevents mobile browser from leaving the page or reloading!)
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [nextPhotoStage, setNextPhotoStage] = useState<PhotoStage>('normal');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Persist draft & activeTab continuously so mobile OS camera reloads never lose state or tab
  useEffect(() => {
    if (existingReport) return;
    try {
      const draftPayload = {
        activeTab,
        projectId,
        date,
        technicianName,
        arrivalTime,
        departureTime,
        breakMinutes,
        hoursWorked,
        areaOrFloor,
        workDone,
        materialsUsed,
        missingMaterials,
        issuesFound,
        nextDayPlan,
        photos,
        checkedTaskIds,
        pdfLang,
      };
      localStorage.setItem('interventi_daily_report_draft_v2', JSON.stringify(draftPayload));
    } catch {
      // ignore quota errors
    }
  }, [
    existingReport,
    activeTab,
    projectId,
    date,
    technicianName,
    arrivalTime,
    departureTime,
    breakMinutes,
    hoursWorked,
    areaOrFloor,
    workDone,
    materialsUsed,
    missingMaterials,
    issuesFound,
    nextDayPlan,
    photos,
    checkedTaskIds,
    pdfLang,
  ]);

  const stopLiveCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startLiveCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    setActiveTab('photos');
    try {
      localStorage.setItem('interventi_daily_modal_open_v1', 'true');
    } catch {}

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Fallback to native file input camera
      cameraInputRef.current?.click();
      return;
    }

    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setCameraFacingMode(facing);
      setIsLiveCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      // If camera permission denied or unavailable in webview, fallback to native input
      cameraInputRef.current?.click();
    }
  };

  const handleCaptureLiveFrame = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (blob) {
          await handleAddPhotos([blob], 'fotocamera');
          setActiveTab('photos');
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const clearDraftAndClose = () => {
    stopLiveCamera();
    try {
      localStorage.removeItem('interventi_daily_report_draft_v2');
      localStorage.removeItem('interventi_daily_modal_open_v1');
    } catch {}
    onClose();
  };

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
          stage: nextPhotoStage,
          caption: areaOrFloor.trim() ? `${areaOrFloor.trim()}` : '',
        });
      }
      setPhotos((prev) => [...prev, ...processed]);
      // If user just took a 'before' (PRIMA) photo, automatically pre-select 'after' (DOPO) for the next shot!
      if (nextPhotoStage === 'before') {
        setNextPhotoStage('after');
      } else if (nextPhotoStage === 'after') {
        setNextPhotoStage('normal');
      }
      setActiveTab('photos');
    } catch (err) {
      console.error('Error processing photos', err);
      alert('Errore durante il caricamento delle foto.');
    } finally {
      setIsProcessingPhotos(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setActiveTab('photos');
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

  const handleUpdatePhotoStage = (photoId: string, stage: PhotoStage) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, stage } : p))
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
      setActiveTab('main');
      alert('Inserisci le cose fatte oggi in cantiere prima di salvare.');
      return;
    }
    const reportObj = buildReportObject();
    onSave(reportObj, checkedTaskIds, missingMaterials.trim() || undefined);
    clearDraftAndClose();
  };

  const hasExtraNotes = Boolean(
    materialsUsed.trim() || missingMaterials.trim() || issuesFound.trim() || nextDayPlan.trim()
  );
  const hasSignatures = Boolean(technicianSignature || clientSignature);

  const filteredProjectTasks = openProjectTasks.filter((t) => {
    if (checklistCategoryFilter === 'ALL') return true;
    const text = `${t.code} ${t.title}`.toLowerCase();
    if (checklistCategoryFilter === 'CCTV') return text.includes('cctv') || text.includes('telecamer') || text.includes('003');
    if (checklistCategoryFilter === 'SOLAR') return text.includes('solar') || text.includes('sungrow') || text.includes('004');
    if (checklistCategoryFilter === 'PARKING') return text.includes('parking') || text.includes('lpr') || text.includes('co') || text.includes('005') || text.includes('001');
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[93vh] sm:max-w-2xl bg-slate-900 sm:border sm:border-slate-700 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Clean Compact Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5 truncate">
                <span className="truncate">Report Giornaliero</span>
                {existingReport && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 shrink-0">
                    {existingReport.code}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Orari cantiere, attività svolte, foto con timbro e PDF IT/EN
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Compact Riprendi da Ieri */}
            {previousProjectReport && (
              <button
                type="button"
                onClick={handleCopyFromYesterday}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition active:scale-95"
                title={`Copia Zona e Programma dal report del ${previousProjectReport.date}`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xs:inline">Ieri</span>
              </button>
            )}

            {/* Compact IT / EN Switcher */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setPdfLang('it')}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition ${
                  pdfLang === 'it' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇮🇹 IT
              </button>
              <button
                type="button"
                onClick={() => setPdfLang('en')}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition ${
                  pdfLang === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                🇬🇧 EN
              </button>
            </div>

            <button
              type="button"
              onClick={clearDraftAndClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Always-Mounted Hidden File/Camera Inputs so mobile browsers never lose the DOM node */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Clean 4-Tab Mobile Navigation Bar */}
        <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-950/90 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('main')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-extrabold transition ${
              activeTab === 'main'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">1. Lavori</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-extrabold transition relative ${
              activeTab === 'photos'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">2. Foto</span>
            {photos.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20 text-white">
                {photos.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-extrabold transition relative ${
              activeTab === 'notes'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">3. Note</span>
            {hasExtraNotes && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('signatures')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-extrabold transition relative ${
              activeTab === 'signatures'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">4. Firme</span>
            {hasSignatures && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5">
            {/* ==================== TAB 1: ORARI, ZONA & LAVORI FATTI OGGI ==================== */}
            {activeTab === 'main' && (
              <>
                {/* Compact Row: Progetto & Data + Tecnico Pill */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Progetto / Cantiere
                      </label>
                      <select
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-yellow-300 focus:outline-none focus:border-emerald-500"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        📅 Data Giornata
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-white font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Compact Technician bar (click to edit if needed) */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400">
                      👷 Tecnico: <strong className="text-slate-200">{technicianName}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTechInput((prev) => !prev)}
                      className="text-[11px] text-emerald-400 hover:underline font-semibold"
                    >
                      {showTechInput ? 'Chiudi' : 'Modifica nome'}
                    </button>
                  </div>

                  {showTechInput && (
                    <input
                      type="text"
                      required
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      placeholder="Nome Tecnico..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>

                {/* Compact Card: Arrivo, Partenza & Durata Cantiere */}
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/35 via-slate-900 to-slate-950 border border-emerald-600/40 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Ora Arrivo */}
                    <div className="bg-slate-950/90 p-2.5 rounded-xl border border-emerald-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                          <LogIn className="w-3 h-3 text-emerald-400" />
                          <span>Arrivo</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setArrivalTime(getCurrentTimeHHMM())}
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95"
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
                    <div className="bg-slate-950/90 p-2.5 rounded-xl border border-amber-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                          <LogOut className="w-3 h-3 text-amber-400" />
                          <span>Uscita</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setDepartureTime(getCurrentTimeHHMM())}
                          className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-95"
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
                  </div>

                  {/* Single Inline Summary Bar for Pausa + Totale Durata */}
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-300">⏱️ Totale:</span>
                      <span className="text-xs sm:text-sm font-mono font-extrabold px-2 py-0.5 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-400/40">
                        {formatHoursAndMinutes(hoursWorked, arrivalTime, departureTime, breakMinutes)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400">☕ Pausa:</span>
                      <select
                        value={breakMinutes}
                        onChange={(e) => setBreakMinutes(Number(e.target.value))}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-blue-400"
                      >
                        <option value={0}>0 min</option>
                        <option value={30}>30 min</option>
                        <option value={45}>45 min</option>
                        <option value={60}>60 min</option>
                        <option value={90}>90 min</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Zona / Impianto Quick Pills */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>Zona / Impianto in Cantiere</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AWASH_QUICK_ZONES.map((z) => {
                      const isSelected = areaOrFloor.includes(z);
                      return (
                        <button
                          key={z}
                          type="button"
                          onClick={() =>
                            setAreaOrFloor((prev) => {
                              if (!prev.trim()) return z;
                              if (prev.includes(z)) {
                                return prev
                                  .split('|')
                                  .map((s) => s.trim())
                                  .filter((s) => s && s !== z)
                                  .join(' | ');
                              }
                              return `${prev.trim()} | ${z}`;
                            })
                          }
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition active:scale-95 ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          {isSelected ? `✓ ${z}` : `+ ${z}`}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={areaOrFloor}
                    onChange={(e) => setAreaOrFloor(e.target.value)}
                    placeholder="Es. Parking area LPR, Solar system, CCTV..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Collapsible Drawer: Checklist Attività Progetto (Closed by default on phone for clean UI!) */}
                {openProjectTasks.length > 0 && (
                  <div className="rounded-xl bg-indigo-950/25 border border-indigo-700/50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsChecklistOpen((prev) => !prev)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-indigo-950/40 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-xs font-extrabold text-indigo-200 truncate">
                          Scegli da Checklist {selectedProjObj?.name}
                        </span>
                        {checkedTaskIds.length > 0 && (
                          <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 shrink-0">
                            {checkedTaskIds.length} scelte
                          </span>
                        )}
                      </div>
                      {isChecklistOpen ? (
                        <ChevronUp className="w-4 h-4 text-indigo-300 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-indigo-300 shrink-0" />
                      )}
                    </button>

                    {isChecklistOpen && (
                      <div className="p-3 pt-1 border-t border-indigo-800/40 space-y-2.5">
                        {/* Quick filter pills for Awash systems */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {[
                            { id: 'ALL', label: 'Tutti' },
                            { id: 'CCTV', label: '📹 CCTV' },
                            { id: 'SOLAR', label: '☀️ Solar' },
                            { id: 'PARKING', label: '🚗 Parking LPR/CO' },
                          ].map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setChecklistCategoryFilter(f.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                checklistCategoryFilter === f.id
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {filteredProjectTasks.map((task) => {
                            const steps = task.actionSteps || [];
                            const openSteps = steps.filter((s) => !s.completed);
                            const doneCount = steps.filter((s) => s.completed).length;

                            return (
                              <div
                                key={task.id}
                                className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-yellow-300 leading-snug">
                                    {task.title}
                                  </span>
                                  {steps.length > 0 && (
                                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                      {doneCount}/{steps.length}
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
                  </div>
                )}

                {/* Cose Fatte Oggi + Clean Mobile Action Toolbar */}
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-extrabold text-yellow-300 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Cose Fatte Oggi in Cantiere *</span>
                    </label>

                    {onOpenAiSettings && (
                      <button
                        type="button"
                        onClick={onOpenAiSettings}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold"
                        title="Impostazioni DeepSeek AI & Quota Rimasta"
                      >
                        <Settings className="w-3 h-3 text-indigo-400" />
                        <span>AI Config</span>
                      </button>
                    )}
                  </div>

                  {/* Clean 3-button Mobile Action Row: Voce | Formatta AI | Traduci EN */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold transition active:scale-95 ${
                        isRecordingVoice
                          ? 'bg-rose-600 text-white animate-pulse shadow-md'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      {isRecordingVoice ? (
                        <MicOff className="w-3.5 h-3.5 text-white shrink-0" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      )}
                      <span className="truncate">{isRecordingVoice ? 'Stop' : '🎤 Detta'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isRunningAi}
                      onClick={() => handleFormatNotesWithAi('it')}
                      className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/50 text-xs font-bold transition active:scale-95 disabled:opacity-50"
                    >
                      {isRunningAi ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-300 shrink-0" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                      )}
                      <span className="truncate">✨ Formatta AI</span>
                    </button>

                    <button
                      type="button"
                      disabled={isRunningAi}
                      onClick={() => handleTranslateReportWithAi('en')}
                      className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-400/50 text-xs font-bold transition active:scale-95 disabled:opacity-50"
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">🇬🇧 Traduci EN</span>
                    </button>
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
                          API Key
                        </button>
                      )}
                    </div>
                  )}

                  <textarea
                    required
                    rows={5}
                    value={workDone}
                    onChange={(e) => setWorkDone(e.target.value)}
                    placeholder="Scrivi o detta a voce i lavori fatti oggi (anche appunti veloci) e premi '✨ Formatta AI' o '🇬🇧 Traduci EN'..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed"
                  />
                </div>
              </>
            )}

            {/* ==================== TAB 2: FOTO DI CANTIERE ==================== */}
            {activeTab === 'photos' && (
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-blue-500/40 space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-blue-400" />
                      <span>Foto del Lavoro ({photos.length})</span>
                    </h4>
                    <label className="flex items-center gap-1.5 text-[11px] text-emerald-300 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={autoStampWatermark}
                        onChange={(e) => setAutoStampWatermark(e.target.checked)}
                        className="rounded accent-emerald-500"
                      />
                      <span>🕒 Timbro automatico Data + Ora + Zona sulle foto</span>
                    </label>
                  </div>
                </div>

                {/* Quick Selector for Next Photo Stage: Standard | PRIMA | DOPO */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-300">
                    Modalità prossima foto:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNextPhotoStage('normal')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition ${
                        nextPhotoStage === 'normal'
                          ? 'bg-blue-600 text-white border-blue-400 shadow'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      📷 Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setNextPhotoStage('before')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition ${
                        nextPhotoStage === 'before'
                          ? 'bg-rose-600 text-white border-rose-400 shadow'
                          : 'bg-slate-950 text-rose-300/80 border-rose-900/50 hover:text-rose-200'
                      }`}
                    >
                      🔴 PRIMA
                    </button>
                    <button
                      type="button"
                      onClick={() => setNextPhotoStage('after')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition ${
                        nextPhotoStage === 'after'
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                          : 'bg-slate-950 text-emerald-300/80 border-emerald-900/50 hover:text-emerald-200'
                      }`}
                    >
                      🟢 DOPO
                    </button>
                  </div>
                </div>

                {/* Big Thumb-Friendly Camera & Gallery Buttons for Phone */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => startLiveCamera('environment')}
                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-extrabold shadow-lg transition active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>📷 Scatta Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('photos');
                      try {
                        localStorage.setItem('interventi_daily_modal_open_v1', 'true');
                      } catch {}
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-blue-600/25 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40 text-xs sm:text-sm font-bold transition active:scale-95"
                  >
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>🖼️ Galleria</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePasteFromClipboardBtn}
                    className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95"
                  >
                    <Clipboard className="w-4 h-4 text-emerald-400" />
                    <span>Incolla Foto</span>
                  </button>
                </div>

                {/* In-App Live Camera Viewfinder (stays inside Tab 2. Foto without leaving the browser!) */}
                {isLiveCameraOpen && (
                  <div className="p-3 rounded-2xl bg-black border-2 border-indigo-500 space-y-3 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-indigo-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span>Fotocamera Cantiere Attiva (Foto salvate qui: {photos.length})</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            startLiveCamera(cameraFacingMode === 'environment' ? 'user' : 'environment')
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-bold border border-slate-700"
                        >
                          🔄 Ruota
                        </button>
                        <button
                          type="button"
                          onClick={stopLiveCamera}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-extrabold"
                        >
                          ✓ Fatto
                        </button>
                      </div>
                    </div>

                    <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleCaptureLiveFrame}
                        disabled={isProcessingPhotos}
                        className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition"
                      >
                        <Camera className="w-5 h-5 text-indigo-600" />
                        <span>📸 SCATTA FOTO ORA</span>
                      </button>
                    </div>
                  </div>
                )}

                {isProcessingPhotos && (
                  <div className="text-center py-2 text-xs text-blue-400 animate-pulse">
                    Elaborazione foto e timbro orario in corso...
                  </div>
                )}

                {photos.some((p) => p.stage === 'before' || p.stage === 'after') && (
                  <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-950/50 via-slate-900 to-emerald-950/50 border border-emerald-500/40 flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-200">
                      ✨ Confronto <strong className="text-rose-400">PRIMA ({photos.filter((p) => p.stage === 'before').length})</strong> ➔ <strong className="text-emerald-400">DOPO ({photos.filter((p) => p.stage === 'after').length})</strong> attivo
                    </span>
                    <span className="text-[11px] text-emerald-300 font-semibold">
                      Affiancate nel PDF!
                    </span>
                  </div>
                )}

                {photos.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-400">
                    Nessuna foto allegata. Tocca <strong>"📷 Scatta Foto"</strong> o <strong>"🖼️ Galleria"</strong> per documentare i lavori di oggi.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {photos.map((photo, idx) => {
                      const stage = photo.stage || 'normal';
                      const borderClass =
                        stage === 'before'
                          ? 'border-rose-500 ring-1 ring-rose-500/40'
                          : stage === 'after'
                          ? 'border-emerald-500 ring-1 ring-emerald-500/40'
                          : 'border-slate-700';

                      return (
                        <div
                          key={photo.id}
                          className={`rounded-xl overflow-hidden border ${borderClass} bg-slate-900 flex flex-col transition`}
                        >
                          <div className="relative aspect-video bg-slate-950 flex items-center justify-center">
                            <img
                              src={photo.url}
                              alt={photo.name}
                              className="max-w-full max-h-full w-auto h-auto object-contain"
                            />
                            <span
                              className={`absolute top-1.5 left-1.5 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded shadow border ${
                                stage === 'before'
                                  ? 'bg-rose-600 text-white border-rose-300'
                                  : stage === 'after'
                                  ? 'bg-emerald-600 text-white border-emerald-300'
                                  : 'bg-black/75 text-white border-white/20'
                              }`}
                            >
                              {stage === 'before'
                                ? `🔴 PRIMA (Foto #${idx + 1})`
                                : stage === 'after'
                                ? `🟢 DOPO (Foto #${idx + 1})`
                                : `Foto #${idx + 1}`}
                            </span>

                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setAnnotatingPhoto(photo)}
                                className="px-2.5 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-extrabold shadow flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Segna</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(photo.id)}
                                className="p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white shadow"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* 3-Button Stage Selector on Each Photo: Standard | PRIMA | DOPO */}
                          <div className="p-2 space-y-1.5 bg-slate-900">
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdatePhotoStage(photo.id, 'normal')}
                                className={`py-1 px-1.5 rounded-lg text-[10px] font-extrabold border transition ${
                                  stage === 'normal'
                                    ? 'bg-slate-700 text-white border-slate-500'
                                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                }`}
                              >
                                📷 Standard
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdatePhotoStage(photo.id, 'before')}
                                className={`py-1 px-1.5 rounded-lg text-[10px] font-extrabold border transition ${
                                  stage === 'before'
                                    ? 'bg-rose-600 text-white border-rose-400 shadow'
                                    : 'bg-slate-950 text-rose-300/80 border-slate-800 hover:border-rose-500/50'
                                }`}
                              >
                                🔴 PRIMA
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdatePhotoStage(photo.id, 'after')}
                                className={`py-1 px-1.5 rounded-lg text-[10px] font-extrabold border transition ${
                                  stage === 'after'
                                    ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                                    : 'bg-slate-950 text-emerald-300/80 border-slate-800 hover:border-emerald-500/50'
                                }`}
                              >
                                🟢 DOPO
                              </button>
                            </div>

                            <input
                              type="text"
                              value={photo.caption || ''}
                              onChange={(e) => handleUpdatePhotoCaption(photo.id, e.target.value)}
                              placeholder={`Didascalia foto #${idx + 1} (es. Quadro cablato)...`}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 3: MATERIALI, DA COMPRARE, PROBLEMI & DOMANI ==================== */}
            {activeTab === 'notes' && (
              <div className="space-y-3">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-sky-300 mb-1.5 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-sky-400" />
                    <span>Materiali / Apparati Installati Oggi (opz.)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={materialsUsed}
                    onChange={(e) => setMaterialsUsed(e.target.value)}
                    placeholder="Es. 4x Telecamere IP, 2x Switch PoE, 50m cavo Cat6..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-rose-500/30">
                  <label className="block text-xs font-bold text-rose-300 mb-1.5 flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-rose-400" />
                    <span>🛒 Materiali Mancanti / Da Comprare (opz.)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={missingMaterials}
                    onChange={(e) => setMissingMaterials(e.target.value)}
                    placeholder="Es. Mancano 20 connettori RJ45 schermati, tasselli M8..."
                    className="w-full bg-slate-900 border border-rose-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Problemi Riscontrati / Note Tecniche (opz.)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={issuesFound}
                    onChange={(e) => setIssuesFound(e.target.value)}
                    placeholder="Es. Assenza tensione su quadro P2, passaggio cavi ostruito..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <label className="block text-xs font-bold text-emerald-300 mb-1.5 flex items-center gap-1.5">
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                    <span>Programma per Domani (opz.)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={nextDayPlan}
                    onChange={(e) => setNextDayPlan(e.target.value)}
                    placeholder="Es. Completare taratura telecamere LPR e prove NVR..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            )}

            {/* ==================== TAB 4: FIRME DIGITALI ==================== */}
            {activeTab === 'signatures' && (
              <div className="space-y-3.5 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <SignaturePad
                    label="Firma Tecnico (Pierluigi / Costantino)"
                    initialSignature={technicianSignature}
                    onChange={setTechnicianSignature}
                  />
                </div>
                <div className="pt-2 border-t border-slate-800 space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Nome Referente Cantiere / Cliente (opz.)
                    </label>
                    <input
                      type="text"
                      value={clientSignerName}
                      onChange={(e) => setClientSignerName(e.target.value)}
                      placeholder="Es. Ing. Dodic / Site Manager Awash..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <SignaturePad
                    label="Firma Referente Cantiere (opz.)"
                    initialSignature={clientSignature}
                    onChange={setClientSignature}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Clean Sticky Bottom Bar (Mobile-First) */}
          <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 border-t border-slate-800 bg-slate-950/95 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => downloadDailySiteReportPDF(buildReportObject(), pdfLang)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition active:scale-95"
                title="Scarica PDF"
              >
                <FileDown className="w-4 h-4 text-blue-400 shrink-0" />
                <span>PDF {pdfLang.toUpperCase()}</span>
              </button>

              <button
                type="button"
                onClick={() => shareDailySiteReportViaWhatsApp(buildReportObject(), pdfLang)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-600/50 transition active:scale-95"
                title="Condividi su WhatsApp"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="hidden xs:inline">WhatsApp</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
              <button
                type="button"
                onClick={clearDraftAndClose}
                className="hidden sm:inline-flex px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/40 transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Salva Report</span>
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
