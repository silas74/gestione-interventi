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
} from 'lucide-react';
import { DailySiteReport, DefectPhoto, Project } from '../types';
import { compressAndProcessImage, extractImagesFromClipboard, readClipboardImagesAsync } from '../lib/photoUtils';
import { downloadDailySiteReportPDF, shareDailySiteReportViaWhatsApp } from '../lib/pdfGenerator';
import { SignaturePad } from './SignaturePad';

interface DailySiteReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  defaultProjectId: string;
  currentUserName: string;
  existingReport?: DailySiteReport | null;
  totalExistingCount: number;
  onSave: (report: DailySiteReport) => void;
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
    // Overnight shift support
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
  totalExistingCount,
  onSave,
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

  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Recalculate hours automatically when arrival, departure, or break changes
  useEffect(() => {
    const computed = calculateNetHours(arrivalTime, departureTime, breakMinutes);
    if (computed !== null && computed >= 0) {
      setHoursWorked(computed);
    }
  }, [arrivalTime, departureTime, breakMinutes]);

  const getCurrentTimeHHMM = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  };

  const handleAddPhotos = async (files: (File | Blob)[], sourceLabel?: string) => {
    if (!files || files.length === 0) return;
    setIsProcessingPhotos(true);
    try {
      const processed: DefectPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const defaultName = sourceLabel ? `${sourceLabel}_${i + 1}.jpg` : undefined;
        const photo = await compressAndProcessImage(files[i], defaultName);
        processed.push({
          ...photo,
          caption: '',
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
      const images = extractImagesFromClipboard(e.clipboardData);
      if (images.length > 0) {
        e.preventDefault();
        handleAddPhotos(images, 'cantiere_incollata');
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const handleUpdatePhotoCaption = (photoId: string, caption: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, caption } : p))
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
    const selectedProj = projects.find((p) => p.id === projectId) || projects[0];
    const projCode = selectedProj ? selectedProj.code.toUpperCase() : 'AWASH';
    const seq = String(totalExistingCount + 1).padStart(3, '0');
    const nowIso = new Date().toISOString();

    return {
      id: existingReport?.id || `day-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: existingReport?.code || `DAY-${projCode}-${seq}`,
      projectId: selectedProj ? selectedProj.id : projectId,
      projectName: selectedProj ? selectedProj.name : 'Awash Bank',
      date,
      technicianName: technicianName.trim() || 'Pierluigi',
      arrivalTime,
      departureTime,
      breakMinutes: Number(breakMinutes) || 0,
      hoursWorked: Number(hoursWorked) || 0,
      areaOrFloor: areaOrFloor.trim() || undefined,
      workDone: workDone.trim() || 'Ispezione tecnica, verifiche impianti e lavori in cantiere.',
      materialsUsed: materialsUsed.trim() || undefined,
      issuesFound: issuesFound.trim() || undefined,
      nextDayPlan: nextDayPlan.trim() || undefined,
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
    onSave(reportObj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>Report Giornaliero di Cantiere (Daily Site Report)</span>
                {existingReport && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-600/50">
                    {existingReport.code}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300">
                Orario di arrivo e partenza, attività svolte oggi, foto di cantiere e generazione PDF
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
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
                Usa i pulsanti <strong className="text-white">"Segna Ora"</strong> quando arrivi e quando esci dal cantiere
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

          {/* Row 3: Zona / Piano / Area Cantiere */}
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
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-200 border border-slate-700 transition"
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

          {/* Row 4: Cose fatte oggi in cantiere */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-yellow-400" />
                <span>Cose Fatte Oggi in Cantiere (Lavori Eseguiti) *</span>
              </label>
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
                <span>{isRecordingVoice ? 'In ascolto (Premi per fermare)...' : '🎤 Detta a Voce'}</span>
              </button>
            </div>
            <textarea
              required
              rows={4}
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              placeholder="Elenca tutte le attività svolte oggi in cantiere (es. Verifica cablaggio sensori CO Parking Area, test centralina, montaggio apparecchiature, prove di funzionamento...)"
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          {/* Row 5: Materiali Usati + Problemi/Note + Programma per Domani */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-sky-300 mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-sky-400" />
                <span>Materiali Installati / Usati</span>
              </label>
              <textarea
                rows={2}
                value={materialsUsed}
                onChange={(e) => setMaterialsUsed(e.target.value)}
                placeholder="Es. 4x Sensori CO, 50m cavo schermato, morsetti..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
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
                <span>Programma per Domani</span>
              </label>
              <textarea
                rows={2}
                value={nextDayPlan}
                onChange={(e) => setNextDayPlan(e.target.value)}
                placeholder="Es. Completare cablaggio zona Nord e avvio test..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Row 6: FOTO DEL GIORNO IN CANTIERE CON DIDASCALIA */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-blue-500/40 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>📸 Foto del Lavoro Fatto Oggi in Cantiere</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {photos.length} foto
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Scatta dal telefono, carica dalla galleria o incolla con Ctrl+V (puoi scrivere una nota sotto ogni foto)
                  </p>
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
                Compressione e ottimizzazione foto in corso...
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
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white shadow"
                        title="Rimuovi foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => downloadDailySiteReportPDF(buildReportObject())}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                <FileDown className="w-4 h-4 text-blue-400" />
                <span>Anteprima PDF Giornaliero</span>
              </button>

              <button
                type="button"
                onClick={() => shareDailySiteReportViaWhatsApp(buildReportObject())}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-600/50 transition"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Invia Report su WhatsApp</span>
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
    </div>
  );
};
