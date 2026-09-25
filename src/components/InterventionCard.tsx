import React from 'react';
import { 
  Calendar, Clock, MapPin, User, Phone, AlertTriangle, 
  CheckCircle2, Wrench, FileDown, MessageSquare, Star, 
  Trash2, Image as ImageIcon, Shield, ArrowRight, FolderKanban
} from 'lucide-react';
import { InterventionRequest, AppRole, DefectPhoto } from '../types';
import { downloadInterventionPDF } from '../lib/pdfGenerator';

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
  const isCompleted = intervention.status === 'completato';
  const isInProgress = intervention.status === 'in_corso';
  const isWaiting = intervention.status === 'in_attesa';

  const isAdmin = currentRole === 'admin';
  const isTechOrAdmin = currentRole === 'admin' || currentRole === 'tecnico';

  // Priority Styles
  const priorityBadge = {
    urgente: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
    alta: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    media: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    bassa: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  }[intervention.priority] || 'bg-slate-500/20 text-slate-300 border-slate-500/40';

  // Status Styles
  const statusBadge = {
    in_attesa: { text: 'In Attesa / Da Fare', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Clock },
    programmato: { text: 'Programmato', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30', icon: Calendar },
    in_corso: { text: 'In Corso On-Site', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Wrench },
    completato: { text: 'Già Fatto / Verbale PDF', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
    annullato: { text: 'Annullato', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30', icon: AlertTriangle },
  }[intervention.status];

  const StatusIcon = statusBadge.icon;

  return (
    <div className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-all duration-200 flex flex-col justify-between ${
      isCompleted 
        ? 'border-emerald-900/40 hover:border-emerald-700/60' 
        : isInProgress 
          ? 'border-blue-800/60 hover:border-blue-600/70 ring-1 ring-blue-500/20' 
          : 'border-slate-800 hover:border-slate-700'
    }`}>
      
      <div>
        {/* Top bar: Code, Project, Priority, Status & Delete button */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {intervention.code}
            </span>

            {/* Progetto Badge */}
            {intervention.projectName && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                <span>{intervention.projectName}</span>
              </span>
            )}

            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityBadge}`}>
              {intervention.priority}
            </span>

            <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusBadge.text}</span>
            </span>
          </div>

          {/* Delete button (Admin or owner) */}
          {(isAdmin || isWaiting) && (
            <button
              onClick={() => onDelete(intervention.id)}
              className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition"
              title="Elimina richiesta"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-white mb-2 leading-snug">
          {intervention.title}
        </h3>

        {/* Site & Client Meta info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 mb-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">{intervention.siteName}</span>
              {intervention.siteAddress && (
                <div className="text-[11px] text-slate-400">{intervention.siteAddress}</div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">{intervention.clientName}</span>
              {intervention.clientContact && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Phone className="w-2.5 h-2.5" />
                  <span>{intervention.clientContact}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desired Access Date & Time */}
        <div className="flex items-center gap-3 text-xs text-slate-300 mb-3">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Data accesso: <strong>{intervention.desiredAccessDate}</strong></span>
          </div>
          {intervention.desiredAccessTime && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Ora: <strong>{intervention.desiredAccessTime}</strong></span>
            </div>
          )}
        </div>

        {/* Description / Spiegazione */}
        <div className="text-xs text-slate-300 mb-3 leading-relaxed">
          <span className="font-semibold text-slate-200">Dettaglio intervento / guasto: </span>
          <span>{intervention.description}</span>
        </div>

        {/* Notes */}
        {intervention.notes && (
          <div className="text-xs text-slate-400 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800 mb-3">
            Note: {intervention.notes}
          </div>
        )}

        {/* Defect Photos Thumbnails */}
        {intervention.defectPhotos && intervention.defectPhotos.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Foto del difetto ({intervention.defectPhotos.length}):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {intervention.defectPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => onPreviewPhoto(photo)}
                  className="relative group cursor-pointer w-16 h-16 rounded-lg overflow-hidden border border-slate-700 shrink-0 hover:border-blue-500 transition"
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <span className="text-[10px] text-white font-semibold">Vedi</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technician Report Section (If Completed) */}
        {isCompleted && intervention.report && (
          <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3.5 mb-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Intervento Eseguito da {intervention.report.technicianName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Clock className="w-3 h-3" />
                <span>{intervention.report.hoursWorked} ore lavorate</span>
              </div>
            </div>

            <div className="text-xs text-slate-300">
              <strong className="text-slate-100">Lavori eseguiti: </strong>
              {intervention.report.workDone}
            </div>

            {intervention.report.materialsUsed && (
              <div className="text-xs text-slate-400">
                <strong className="text-slate-300">Materiali: </strong>
                {intervention.report.materialsUsed}
              </div>
            )}

            {/* Download PDF button inside report */}
            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => downloadInterventionPDF(intervention)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow transition"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Scarica Rapporto PDF</span>
              </button>

              <span className="text-[11px] text-slate-400">
                Data: {intervention.report.interventionDate}
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
                <span>Risposta Richiedente: {intervention.clientFeedback.clientName}</span>
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
              Ricevuta il {new Date(intervention.clientFeedback.submittedAt).toLocaleDateString('it-IT')}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        
        {/* Left side: assigned technician info */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>
            {intervention.assignedTechnician ? `Assegnato a ${intervention.assignedTechnician}` : 'Nessun tecnico assegnato'}
          </span>
        </div>

        {/* Right side contextual buttons */}
        <div className="flex items-center gap-2">
          
          {/* Action: Take charge (if waiting and is tech or admin) */}
          {isWaiting && isTechOrAdmin && (
            <button
              onClick={() => onTakeCharge(intervention.id, currentUserName)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow transition active:scale-95"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Prendi in Carico</span>
            </button>
          )}

          {/* Action: Fill / Edit technician report (if tech or admin) */}
          {isTechOrAdmin && (
            <button
              onClick={() => onOpenReportModal(intervention)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                isCompleted 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-600/30'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{isCompleted ? 'Modifica Rapporto' : 'Compila Rapporto & Chiudi'}</span>
            </button>
          )}

          {/* Action: Client response / feedback (if completed) */}
          {isCompleted && (
            <button
              onClick={() => onOpenFeedbackModal(intervention)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{intervention.clientFeedback ? 'Aggiorna Risposta' : 'Invia Risposta / Feedback'}</span>
            </button>
          )}

          {/* Download PDF button if completed */}
          {isCompleted && (
            <button
              onClick={() => downloadInterventionPDF(intervention)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Scarica PDF"
            >
              <FileDown className="w-4 h-4 text-blue-400" />
            </button>
          )}

        </div>

      </div>

    </div>
  );
};
