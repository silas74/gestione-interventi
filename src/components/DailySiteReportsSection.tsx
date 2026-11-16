import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Camera,
  FileDown,
  MessageCircle,
  PlusCircle,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  MapPin,
  Wrench,
  Package,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DailySiteReport, DefectPhoto, Project } from '../types';
import {
  downloadDailySiteReportPDF,
  shareDailySiteReportViaWhatsApp,
  downloadProjectTimesheetPDF,
} from '../lib/pdfGenerator';
import { exportDailySiteReportsToExcel } from '../lib/excelExport';
import { calculateNetHours, formatHoursAndMinutes } from './DailySiteReportModal';

interface DailySiteReportsSectionProps {
  reports: DailySiteReport[];
  activeProject?: Project;
  currentUserName: string;
  onOpenNewReportModal: () => void;
  onOpenEditReportModal: (report: DailySiteReport) => void;
  onQuickSaveReport: (report: DailySiteReport) => void;
  onDeleteReport: (id: string) => void;
  onPreviewPhoto: (photo: DefectPhoto) => void;
}

export const DailySiteReportsSection: React.FC<DailySiteReportsSectionProps> = ({
  reports,
  activeProject,
  currentUserName,
  onOpenNewReportModal,
  onOpenEditReportModal,
  onQuickSaveReport,
  onDeleteReport,
  onPreviewPhoto,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const projectTitle = activeProject ? activeProject.name : 'Tutti i Progetti';
  const todayStr = new Date().toISOString().split('T')[0];
  const todayReport = reports.find((r) => r.date === todayStr);

  const totalDays = reports.length;
  const totalHours = reports.reduce((acc, r) => acc + (Number(r.hoursWorked) || 0), 0);
  const totalPhotos = reports.reduce((acc, r) => acc + (r.photos?.length || 0), 0);

  const getCurrentTimeHHMM = () => new Date().toTimeString().slice(0, 5);

  // 1-Click Quick Check-In (Arrivo in Cantiere Oggi)
  const handleQuickArrivalCheckIn = () => {
    const nowTime = getCurrentTimeHHMM();
    if (todayReport) {
      const computedHours = calculateNetHours(nowTime, todayReport.departureTime, todayReport.breakMinutes);
      const updated: DailySiteReport = {
        ...todayReport,
        arrivalTime: nowTime,
        hoursWorked: computedHours !== null ? computedHours : todayReport.hoursWorked,
        updatedAt: new Date().toISOString(),
      };
      onQuickSaveReport(updated);
      onOpenEditReportModal(updated);
      return;
    }

    const projId = activeProject ? activeProject.id : 'proj-awash-bank';
    const projName = activeProject ? activeProject.name : 'Awash Bank';
    const projCode = activeProject ? activeProject.code.toUpperCase() : 'AWASH';
    const seq = String(reports.length + 1).padStart(3, '0');
    const nowIso = new Date().toISOString();

    const newReport: DailySiteReport = {
      id: `day-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: `DAY-${projCode}-${seq}`,
      projectId: projId,
      projectName: projName,
      date: todayStr,
      technicianName: currentUserName || 'Pierluigi',
      arrivalTime: nowTime,
      departureTime: '17:30',
      breakMinutes: 0,
      hoursWorked: calculateNetHours(nowTime, '17:30', 0) ?? 8,
      areaOrFloor: 'Parking area CO',
      workDone: `Arrivo in cantiere alle ore ${nowTime}. Avvio attività tecniche e sopralluogo.`,
      photos: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onQuickSaveReport(newReport);
    onOpenEditReportModal(newReport);
  };

  // 1-Click Quick Check-Out (Uscita dal Cantiere)
  const handleQuickDepartureCheckOut = (report: DailySiteReport) => {
    const nowTime = getCurrentTimeHHMM();
    const computedHours = calculateNetHours(report.arrivalTime, nowTime, report.breakMinutes);
    const updated: DailySiteReport = {
      ...report,
      departureTime: nowTime,
      hoursWorked: computedHours !== null ? computedHours : report.hoursWorked,
      updatedAt: new Date().toISOString(),
    };
    onQuickSaveReport(updated);
    onOpenEditReportModal(updated);
  };

  return (
    <div className="mb-6 rounded-2xl p-3.5 sm:p-4 liquid-glass border border-emerald-500/45 bg-gradient-to-r from-emerald-950/35 via-slate-900/90 to-slate-950/90 shadow-lg shadow-emerald-950/20">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                📅 Diario Giornaliero di Cantiere — {projectTitle}
              </h2>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                {totalDays} {totalDays === 1 ? 'giorno' : 'giorni'}
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40">
                ⏱️ {formatHoursAndMinutes(totalHours)} totali
              </span>
              {totalPhotos > 0 && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
                  📸 {totalPhotos} foto
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Registra ogni giorno ad Addis: <strong>Orario di Arrivo e Partenza</strong>, <strong>Cose fatte oggi</strong> e <strong>Foto cantiere</strong> con PDF giornaliero
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1-Click Check-in Arrivo */}
          <button
            type="button"
            onClick={handleQuickArrivalCheckIn}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-400/50 text-xs font-bold transition active:scale-95 shadow-sm"
            title="Registra subito l'orario di arrivo di oggi in cantiere"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
            <span>📍 Segna Arrivo Ora</span>
          </button>

          {/* 1-Click Check-out Partenza (if today's report exists) */}
          {todayReport && (
            <button
              type="button"
              onClick={() => handleQuickDepartureCheckOut(todayReport)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 border border-amber-400/50 text-xs font-bold transition active:scale-95 shadow-sm"
              title="Aggiorna l'orario di uscita di oggi dal cantiere"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              <span>🏁 Segna Uscita Ora</span>
            </button>
          )}

          {/* Main CTA: + Nuovo Report Giornaliero */}
          <button
            type="button"
            onClick={onOpenNewReportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md shadow-emerald-900/40 transition active:scale-95 border border-emerald-300/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Report Giornaliero (Oggi)</span>
          </button>

          {/* Cumulative Timesheet PDF & Excel */}
          {reports.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => downloadProjectTimesheetPDF(projectTitle, reports)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-yellow-300 border border-yellow-500/40 text-xs font-bold transition active:scale-95"
                title="Scarica il PDF cumulativo con tutte le giornate, orari di arrivo/uscita e lavori svolti"
              >
                <FileDown className="w-3.5 h-3.5 text-yellow-400" />
                <span>Timesheet PDF</span>
              </button>

              <button
                type="button"
                onClick={() => exportDailySiteReportsToExcel(projectTitle, reports)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition active:scale-95"
                title="Esporta foglio presenze giornaliero in Excel (CSV)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Presenze Excel</span>
              </button>
            </>
          )}

          {reports.length > 0 && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title={isExpanded ? 'Comprimi elenco giornate' : 'Mostra elenco giornate'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* List of Daily Site Reports */}
      {isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-white/10">
          {reports.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
              <div>
                Nessun report giornaliero registrato per <strong>{projectTitle}</strong>. Quando arrivi in cantiere ad Addis, premi <strong>"📍 Segna Arrivo Ora"</strong> o <strong>"+ Report Giornaliero (Oggi)"</strong> per registrare orario di ingresso/uscita, lavori fatti e foto!
              </div>
              <button
                type="button"
                onClick={onOpenNewReportModal}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 transition"
              >
                + Compila Primo Report Giornaliero
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-2xl bg-slate-950/85 border border-emerald-700/45 hover:border-emerald-500/70 transition flex flex-col justify-between gap-3 shadow-md"
                >
                  <div className="space-y-2.5">
                    {/* Card Top Metadata: Date, Arrival, Departure, Hours */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{rep.date}</span>
                        </span>

                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-700">
                          {rep.code}
                        </span>

                        {rep.projectName && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            {rep.projectName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenEditReportModal(rep)}
                          className="px-2 py-1 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-[11px] font-bold flex items-center gap-1 transition"
                          title="Modifica report o aggiungi foto"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Modifica</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Eliminare il report giornaliero del ${rep.date} (${rep.code})?`)) {
                              onDeleteReport(rep.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition"
                          title="Elimina giornata"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Highlighted Arrival & Departure Strip */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-900/95 border border-slate-800 text-xs">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <LogIn className="w-3 h-3" />
                          <span>Arrivo Cantiere</span>
                        </span>
                        <span className="font-mono font-extrabold text-sm text-white">
                          {rep.arrivalTime || '--:--'}
                        </span>
                      </div>

                      <div className="flex flex-col border-x border-slate-800 px-2">
                        <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                          <LogOut className="w-3 h-3" />
                          <span>Uscita Cantiere</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-sm text-white">
                            {rep.departureTime || '--:--'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickDepartureCheckOut(rep)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30"
                            title="Imposta ora attuale di uscita"
                          >
                            Ora
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col pl-1">
                        <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Durata Lavoro</span>
                        </span>
                        <span className="font-mono font-extrabold text-sm text-yellow-300">
                          {formatHoursAndMinutes(rep.hoursWorked, rep.arrivalTime, rep.departureTime, rep.breakMinutes)}{' '}
                          {rep.breakMinutes > 0 && (
                            <span className="text-[10px] font-normal text-slate-400">
                              (-{rep.breakMinutes}m pausa)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Area / Floor */}
                    {rep.areaOrFloor && (
                      <div className="text-xs text-blue-200 flex items-center gap-1.5 bg-blue-950/30 px-2.5 py-1 rounded-lg border border-blue-800/40">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>
                          <strong>Zona / Piano:</strong> {rep.areaOrFloor}
                        </span>
                      </div>
                    )}

                    {/* Work Done */}
                    <div className="text-xs text-slate-100 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="text-[11px] font-bold text-yellow-300 mb-0.5 flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-yellow-400" />
                        <span>Lavori svolti oggi in cantiere:</span>
                      </div>
                      <p className="whitespace-pre-wrap">{rep.workDone}</p>
                    </div>

                    {/* Materials, Issues, Next Day Plan */}
                    {rep.materialsUsed && (
                      <div className="text-xs text-sky-200 flex items-start gap-1.5">
                        <Package className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Materiali:</strong> {rep.materialsUsed}
                        </span>
                      </div>
                    )}

                    {rep.issuesFound && (
                      <div className="text-xs text-amber-200 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Problemi / Note:</strong> {rep.issuesFound}
                        </span>
                      </div>
                    )}

                    {rep.nextDayPlan && (
                      <div className="text-xs text-emerald-300 flex items-start gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Programma domani:</strong> {rep.nextDayPlan}
                        </span>
                      </div>
                    )}

                    {/* Photos Gallery */}
                    {rep.photos && rep.photos.length > 0 && (
                      <div className="pt-1">
                        <div className="text-[11px] font-bold text-blue-300 mb-1.5 flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-blue-400" />
                          <span>Foto Cantiere del {rep.date} ({rep.photos.length}):</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {rep.photos.map((photo) => (
                            <div
                              key={photo.id}
                              onClick={() => onPreviewPhoto(photo)}
                              className="group relative cursor-pointer w-24 h-20 rounded-lg overflow-hidden border border-blue-500/50 hover:border-yellow-400 shrink-0 bg-slate-950 flex items-center justify-center"
                              title={photo.caption || photo.name}
                            >
                              <img
                                src={photo.url}
                                alt={photo.caption || photo.name}
                                className="max-w-full max-h-full w-auto h-auto object-contain group-hover:scale-105 transition"
                              />
                              {photo.caption && (
                                <div className="absolute bottom-0 inset-x-0 bg-black/75 px-1 py-0.5 text-[9px] text-white truncate">
                                  {photo.caption}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Download Daily PDF & Share WhatsApp */}
                  <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-400">
                      👷 Tecnico: <strong className="text-slate-200">{rep.technicianName}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => downloadDailySiteReportPDF(rep)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition active:scale-95"
                        title="Scarica PDF ufficiale del report di questa giornata"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>PDF Giorno</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => shareDailySiteReportViaWhatsApp(rep)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 text-xs font-bold transition active:scale-95"
                        title="Invia PDF e riepilogo giornata su WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
