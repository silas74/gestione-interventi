import React from 'react';
import { 
  Calendar, Clock, MapPin, User, Phone, AlertTriangle, 
  CheckCircle2, Wrench, FileDown, MessageSquare, Star, 
  Trash2, Image as ImageIcon, Shield, FolderKanban, AlertCircle,
  PhoneCall, MessageCircle, Share2, Mail, Camera
} from 'lucide-react';
import { InterventionRequest, AppRole, DefectPhoto } from '../types';
import { downloadInterventionPDF, shareInterventionPDFViaWhatsApp } from '../lib/pdfGenerator';
import { getTelUri, getClientWhatsAppUri, getTicketShareWhatsAppUri } from '../lib/contactUtils';

interface InterventionCardProps {
  intervention: InterventionRequest;
  currentRole: AppRole;
  currentUserName: string;
  onTakeCharge: (id: string, technicianName: string) => void;
  onOpenReportModal: (intervention: InterventionRequest) => void;
  onOpenFeedbackModal: (intervention: InterventionRequest) => void;
  onPreviewPhoto: (photo: DefectPhoto) => void;
  onDelete: (id: string) => void;
}

export const InterventionCard: React.FC<InterventionCardProps> = ({
  intervention,
  currentRole,
  currentUserName,
  onTakeCharge,
  onOpenReportModal,
  onOpenFeedbackModal,
  onPreviewPhoto,
  onDelete,
}) => {
  const isCompleted = intervention.status === 'completed' || intervention.status === 'completato';
  const isPending = !isCompleted; // All open tasks (pending, scheduled, in_progress)
  const isWaiting = intervention.status === 'pending' || intervention.status === 'in_attesa';
  const isUrgent = intervention.priority === 'urgent' || intervention.priority === 'urgente';
  const isWaitingForParts = (intervention.report?.statusOutcome === 'waiting_for_parts' || 
                            (intervention.report?.statusOutcome as string) === 'in_attesa_ricambi');
  const isInProgress = (intervention.status === 'in_progress' || intervention.status === 'in_corso') && !isCompleted;

  const isAdmin = currentRole === 'admin';
  const isTechOrAdmin = currentRole === 'admin' || currentRole === 'technician' || currentRole === 'tecnico';

  // Priority Styles
  const priorityBadge = {
    urgent: isPending
      ? 'animate-flash-urgent font-black tracking-wider shadow-md'
      : 'bg-red-500/25 text-red-300 border-red-500/50 font-bold',
    urgente: isPending
      ? 'animate-flash-urgent font-black tracking-wider shadow-md'
      : 'bg-red-500/25 text-red-300 border-red-500/50 font-bold',
    high: 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold',
    alta: 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold',
    medium: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    media: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    low: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    bassa: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  }[intervention.priority] || 'bg-slate-500/20 text-slate-300 border-slate-500/40';

  return (
    <div className={`rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between border ${
      isPending
        ? isUrgent
          ? 'bg-gradient-to-b from-rose-950/35 via-slate-900 to-slate-900 animate-flash-card-urgent ring-1 ring-red-500/40'
          : isWaitingForParts
            ? 'bg-gradient-to-b from-pink-950/35 via-slate-900 to-slate-900 border-pink-700/60 hover:border-pink-500/80 shadow-pink-950/30 ring-1 ring-pink-500/30'
            : isInProgress
              ? 'bg-gradient-to-b from-amber-950/30 via-slate-900 to-slate-900 border-amber-700/60 hover:border-amber-500/80 shadow-amber-950/25'
              : 'bg-gradient-to-b from-rose-950/25 via-slate-900 to-slate-900 border-rose-800/45 hover:border-rose-600/70 shadow-rose-950/20'
        : 'bg-gradient-to-b from-emerald-950/25 via-slate-900 to-slate-900 border-emerald-800/45 hover:border-emerald-600/70 shadow-emerald-950/20'
    }`}>
      
      <div>
        {/* Urgent Alert Siren Banner (flashing Red <-> Yellow) */}
        {isUrgent && isPending && (
          <div className="mb-3 px-3 py-1.5 rounded-xl animate-flash-urgent flex items-center justify-between text-xs font-black tracking-wider shadow-md">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 animate-flash-siren shrink-0" />
              <span>URGENT PRIORITY ALERT</span>
            </span>
            <span className="text-[10px] font-mono uppercase bg-black/30 px-2 py-0.5 rounded-md border border-white/20">
              ACTION REQUIRED
            </span>
          </div>
        )}

        {/* Top bar: Code, Project, State Badge, Priority & Delete */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Code */}
            <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border ${
              isPending 
                ? isWaitingForParts
                  ? 'bg-pink-950/60 text-pink-200 border-pink-600/60 shadow-sm shadow-pink-900/30'
                  : isInProgress
                    ? 'bg-amber-950/50 text-amber-200 border-amber-700/50'
                    : 'bg-rose-950/50 text-rose-200 border-rose-700/50' 
                : 'bg-emerald-950/50 text-emerald-200 border-emerald-700/50'
            }`}>
              {intervention.code}
            </span>

            {/* Project Badge */}
            {intervention.projectName && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                <span>{intervention.projectName}</span>
              </span>
            )}

            {/* MAIN STATUS BADGE (PINK = WORKING IN PROGRESS / WAITING FOR PARTS, AMBER = IN PROGRESS, RED = TO DO, GREEN = COMPLETED) */}
            {isCompleted ? (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>COMPLETED</span>
              </span>
            ) : isWaitingForParts ? (
              <span className="flex items-center gap-1.5 text-xs font-black px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/50 shadow-sm shadow-pink-950/40">
                <Clock className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                <span>WORKING IN PROGRESS (Waiting for Parts)</span>
              </span>
            ) : isInProgress ? (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>WORKING IN PROGRESS</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>TO DO</span>
              </span>
            )}

            {/* Priority */}
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${priorityBadge}`}>
              {isUrgent && isPending && <AlertTriangle className="w-3 h-3 animate-flash-siren" />}
              <span>{intervention.priority}</span>
            </span>

            {/* Inbound Email Source Badge */}
            {intervention.emailSource && (
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1 shadow-sm"
                title={`Ricevuto via Email da ${intervention.emailSource.sender} il ${intervention.emailSource.receivedAt}`}
              >
                <Mail className="w-3 h-3 text-blue-400" />
                <span>Email</span>
              </span>
            )}
          </div>

          {/* Top Quick Actions: WhatsApp Share + Delete */}
          <div className="flex items-center gap-1">
            <a
              href={getTicketShareWhatsAppUri(intervention)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-800 transition active:scale-95"
              title="Share ticket summary via WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </a>

            {/* Delete button (Admin or owner) */}
            {(isAdmin || isWaiting) && (
              <button
                onClick={() => onDelete(intervention.id)}
                className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition active:scale-95"
                title="Delete request"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className={`text-base font-bold mb-2 leading-snug ${
          isPending ? 'text-white' : 'text-slate-100'
        }`}>
          {intervention.title}
        </h3>

        {/* Site & Client Meta info */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3 p-3 rounded-xl border ${
          isCompleted
            ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-100/90'
            : isWaitingForParts
              ? 'bg-pink-950/25 border-pink-800/40 text-pink-100/95 shadow-sm shadow-pink-950/20'
              : 'bg-rose-950/20 border-rose-900/40 text-rose-100/90'
        }`}>
          <div className="flex items-start gap-1.5">
            <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
              isCompleted ? 'text-emerald-400' : isWaitingForParts ? 'text-pink-400' : 'text-rose-400'
            }`} />
            <div>
              <span className="font-semibold text-white">{intervention.siteName}</span>
              {intervention.siteAddress && (
                <div className="text-[11px] text-slate-400">{intervention.siteAddress}</div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div className="flex items-start gap-1.5">
              <User className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                isCompleted ? 'text-emerald-400' : isWaitingForParts ? 'text-pink-400' : 'text-rose-400'
              }`} />
              <div className="min-w-0">
                <span className="font-semibold text-white truncate block">{intervention.clientName}</span>
                {intervention.clientContact && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                    <Phone className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{intervention.clientContact}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Call & Direct WhatsApp Action Buttons */}
            {intervention.clientContact && (
              <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-slate-800/60 flex-wrap">
                {getTelUri(intervention.clientContact) && (
                  <a
                    href={getTelUri(intervention.clientContact)!}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/35 text-[11px] font-semibold transition active:scale-95 shadow-sm"
                    title={`Direct Call: ${intervention.clientContact}`}
                  >
                    <PhoneCall className="w-3 h-3 text-blue-400" />
                    <span>Call</span>
                  </a>
                )}
                <a
                  href={getClientWhatsAppUri(intervention)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition active:scale-95 shadow-sm"
                  title={`Direct WhatsApp chat with ${intervention.clientName}`}
                >
                  <MessageCircle className="w-3 h-3 text-emerald-400" />
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Desired Access Date & Time */}
        <div className="flex items-center gap-3 text-xs mb-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
            isCompleted 
              ? 'bg-slate-800/80 text-emerald-200 border-emerald-800/40' 
              : isWaitingForParts
                ? 'bg-slate-800/80 text-pink-200 border-pink-800/40'
                : 'bg-slate-800/80 text-rose-200 border-rose-800/40'
          }`}>
            <Calendar className={`w-3.5 h-3.5 ${
              isCompleted ? 'text-emerald-400' : isWaitingForParts ? 'text-pink-400' : 'text-rose-400'
            }`} />
            <span>Date: <strong>{intervention.desiredAccessDate}</strong></span>
          </div>
          {intervention.desiredAccessTime && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
              isCompleted 
                ? 'bg-slate-800/80 text-emerald-200 border-emerald-800/40' 
                : isWaitingForParts
                  ? 'bg-slate-800/80 text-pink-200 border-pink-800/40'
                  : 'bg-slate-800/80 text-rose-200 border-rose-800/40'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${
                isCompleted ? 'text-emerald-400' : isWaitingForParts ? 'text-pink-400' : 'text-rose-400'
              }`} />
              <span>Time: <strong>{intervention.desiredAccessTime}</strong></span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="text-xs text-slate-300 mb-3 leading-relaxed">
          <span className="font-semibold text-slate-200">Task details: </span>
          <span>{intervention.description}</span>
        </div>

        {/* Notes (Multiline) */}
        {intervention.notes && (
          <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 mb-3 whitespace-pre-wrap leading-relaxed">
            <strong className="text-slate-400 block mb-0.5 text-[11px]">Notes for technician:</strong>
            {intervention.notes}
          </div>
        )}

        {/* Inbound Email Source & Follow-up History (Antigravity Smart Email) */}
        {(intervention.emailSource || (intervention.emailHistory && intervention.emailHistory.length > 0)) && (
          <div className="bg-blue-950/25 border border-blue-700/50 rounded-xl p-3 mb-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-blue-300 font-bold flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>Inbound Email Integration</span>
              </div>
              {intervention.emailSource && (
                <span className="text-[10px] text-blue-300 font-mono bg-blue-900/50 px-2 py-0.5 rounded border border-blue-700/40">
                  Data: {intervention.emailSource.receivedAt}
                </span>
              )}
            </div>

            {/* Progetto su cui è registrato l'intervento da email */}
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-blue-900/30 border border-blue-700/50 text-[11px] flex-wrap">
              <div className="flex items-center gap-1.5 text-blue-200">
                <FolderKanban className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-blue-300 font-medium">Registrato su Progetto:</span>
                <strong className="text-white font-bold bg-blue-950 px-2 py-0.5 rounded border border-blue-700/60 shadow-sm">
                  {intervention.projectName || intervention.emailSource?.projectName || 'Workbank'}
                </strong>
              </div>
              {intervention.siteName && (
                <span className="text-[10px] text-slate-400 truncate">
                  Impianto: {intervention.siteName}
                </span>
              )}
            </div>

            {intervention.emailSource && (
              <div className="text-[11px] text-slate-300">
                <span className="text-slate-400 font-medium">Ricevuto Da (Mittente): </span>
                <strong className="text-white">{intervention.emailSource.sender}</strong>
                {intervention.emailSource.subject && (
                  <div className="text-slate-400 italic truncate mt-0.5">
                    "{intervention.emailSource.subject}"
                  </div>
                )}
              </div>
            )}

            {/* Follow-up email history */}
            {intervention.emailHistory && intervention.emailHistory.length > 0 && (
              <div className="pt-2 border-t border-blue-900/40 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Storico Email & Follow-up ({intervention.emailHistory.length})
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {intervention.emailHistory.map((item) => (
                    <div key={item.id} className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5 flex-wrap gap-1">
                        <span className="font-semibold text-blue-300">{item.sender}</span>
                        <span className="font-mono text-slate-400">{item.receivedAt}</span>
                      </div>
                      <div className="text-slate-200">{item.message}</div>
                      <div className="pt-1 border-t border-slate-800/80 flex items-center gap-1 text-[10px] text-blue-300/80 font-medium">
                        <FolderKanban className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>Progetto registrato: <strong className="text-white">{item.projectName || intervention.projectName || 'Generale'}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Defect Photos Thumbnails */}
        {intervention.defectPhotos && intervention.defectPhotos.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
              <ImageIcon className={`w-3.5 h-3.5 ${isPending ? 'text-rose-400' : 'text-emerald-400'}`} />
              <span>Defect photos ({intervention.defectPhotos.length}):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {intervention.defectPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => onPreviewPhoto(photo)}
                  className={`relative group cursor-pointer w-16 h-16 rounded-lg overflow-hidden border shrink-0 transition ${
                    isPending ? 'border-rose-800 hover:border-rose-400' : 'border-emerald-800 hover:border-emerald-400'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <span className="text-[10px] text-white font-semibold">View</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Execution Photos Thumbnails */}
        {intervention.report?.reportPhotos && intervention.report.reportPhotos.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 mb-2">
              <Camera className="w-3.5 h-3.5 text-blue-400" />
              <span>Foto Lavoro Eseguito / Report ({intervention.report.reportPhotos.length}):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {intervention.report.reportPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => onPreviewPhoto(photo)}
                  className="relative group cursor-pointer w-16 h-16 rounded-lg overflow-hidden border border-blue-600/60 hover:border-blue-400 shrink-0 transition shadow-sm"
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <span className="text-[10px] text-white font-semibold">View</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting for Parts Interim Report Section (PINK TONES) */}
        {!isCompleted && isWaitingForParts && intervention.report && (
          <div className="bg-pink-950/30 border border-pink-700/50 rounded-xl p-3.5 mb-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-pink-300">
                <Clock className="w-4 h-4 text-pink-400 animate-pulse" />
                <span>Working in Progress — Waiting for Parts (Tech: {intervention.report.technicianName})</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 border border-pink-500/30">
                <Clock className="w-3 h-3 text-pink-400" />
                <span>{intervention.report.hoursWorked} hours logged</span>
              </div>
            </div>

            <div className="text-xs text-slate-200">
              <strong className="text-pink-300">Work performed: </strong>
              {intervention.report.workDone}
            </div>

            {intervention.report.materialsUsed && (
              <div className="text-xs text-slate-300">
                <strong className="text-pink-400">Parts Needed / Materials: </strong>
                {intervention.report.materialsUsed}
              </div>
            )}

            {intervention.report.technicalNotes && (
              <div className="text-xs text-slate-300">
                <strong className="text-pink-400">Notes: </strong>
                {intervention.report.technicalNotes}
              </div>
            )}

            {/* Interim Report PDF & WhatsApp buttons */}
            <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => downloadInterventionPDF(intervention)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-900/40 transition active:scale-95"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Interim PDF</span>
                </button>
                <button
                  onClick={() => shareInterventionPDFViaWhatsApp(intervention)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/40 shadow transition active:scale-95"
                  title="Share interim report directly via WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Send PDF on WhatsApp</span>
                </button>
              </div>

              <span className="text-[11px] text-pink-300/80">
                Logged: {intervention.report.interventionDate}
              </span>
            </div>
          </div>
        )}

        {/* Technician Report Section (If Completed - GREEN TONES) */}
        {isCompleted && intervention.report && (
          <div className="bg-emerald-950/30 border border-emerald-700/50 rounded-xl p-3.5 mb-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Service Completed by {intervention.report.technicianName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>{intervention.report.hoursWorked} hours worked</span>
              </div>
            </div>

            <div className="text-xs text-slate-200">
              <strong className="text-emerald-300">Work performed: </strong>
              {intervention.report.workDone}
            </div>

            {intervention.report.materialsUsed && (
              <div className="text-xs text-slate-300">
                <strong className="text-emerald-400">Materials: </strong>
                {intervention.report.materialsUsed}
              </div>
            )}

            {/* Download PDF & Share PDF via WhatsApp buttons inside report */}
            <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => downloadInterventionPDF(intervention)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40 transition active:scale-95"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => shareInterventionPDFViaWhatsApp(intervention)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/40 shadow transition active:scale-95"
                  title="Share official PDF Report directly via WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Send PDF on WhatsApp</span>
                </button>
              </div>

              <span className="text-[11px] text-emerald-300/80">
                Date: {intervention.report.interventionDate}
              </span>
            </div>
          </div>
        )}

        {/* Client Feedback Section (If Present) */}
        {intervention.clientFeedback && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Client Acceptance: {intervention.clientFeedback.clientName}</span>
              </div>
              {intervention.clientFeedback.rating && (
                <div className="flex items-center gap-0.5">
                  {[...Array(intervention.clientFeedback.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 italic">
              "{intervention.clientFeedback.notes}"
            </p>

            <div className="text-[10px] text-slate-500 text-right">
              Received on {new Date(intervention.clientFeedback.submittedAt).toLocaleDateString('en-US')}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className={`pt-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 ${
        isCompleted 
          ? 'border-emerald-900/40' 
          : isWaitingForParts
            ? 'border-pink-800/40'
            : 'border-rose-900/40'
      }`}>
        
        {/* Left side: assigned technician info */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Shield className={`w-3.5 h-3.5 ${
            isCompleted ? 'text-emerald-400' : isWaitingForParts ? 'text-pink-400' : 'text-rose-400'
          }`} />
          <span className="truncate">
            {intervention.assignedTechnician ? `Assigned to ${intervention.assignedTechnician}` : 'No technician assigned'}
          </span>
        </div>

        {/* Right side contextual buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-stretch sm:justify-end">
          
          {/* Action: Take charge (if waiting and is tech or admin) */}
          {isWaiting && isTechOrAdmin && (
            <button
              onClick={() => onTakeCharge(intervention.id, currentUserName)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-900/30 transition active:scale-95"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Take Charge</span>
            </button>
          )}

          {/* Action: Fill / Edit technician report (if tech or admin) */}
          {isTechOrAdmin && (
            <button
              onClick={() => onOpenReportModal(intervention)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                isCompleted 
                  ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-700/60' 
                  : isWaitingForParts
                    ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-900/30'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{isCompleted ? 'Edit Report' : isWaitingForParts ? 'Update Parts / Complete' : 'Execute & Complete'}</span>
            </button>
          )}

          {/* Action: Client response / feedback (if completed) */}
          {isCompleted && (
            <button
              onClick={() => onOpenFeedbackModal(intervention)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{intervention.clientFeedback ? 'Update Acceptance' : 'Sign & Feedback'}</span>
            </button>
          )}

          {/* Download PDF button if completed */}
          {isCompleted && (
            <button
              onClick={() => downloadInterventionPDF(intervention)}
              className="p-1.5 rounded-lg bg-emerald-900/30 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 transition"
              title="Download PDF"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
            </button>
          )}

        </div>

      </div>

    </div>
  );
};
