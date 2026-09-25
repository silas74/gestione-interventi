import React from 'react';
import { 
  Calendar, Clock, MapPin, User, Phone, AlertTriangle, 
  CheckCircle2, Wrench, FileDown, MessageSquare, Star, 
  Trash2, Image as ImageIcon, Shield, FolderKanban, AlertCircle,
  PhoneCall, MessageCircle, Share2
} from 'lucide-react';
import { InterventionRequest, AppRole, DefectPhoto } from '../types';
import { downloadInterventionPDF } from '../lib/pdfGenerator';
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

  const isAdmin = currentRole === 'admin';
  const isTechOrAdmin = currentRole === 'admin' || currentRole === 'technician' || currentRole === 'tecnico';

  // Priority Styles
  const priorityBadge = {
    urgent: 'bg-red-500/25 text-red-300 border-red-500/50 animate-pulse font-bold',
    urgente: 'bg-red-500/25 text-red-300 border-red-500/50 animate-pulse font-bold',
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
        ? 'bg-gradient-to-b from-rose-950/25 via-slate-900 to-slate-900 border-rose-800/45 hover:border-rose-600/70 shadow-rose-950/20'
        : 'bg-gradient-to-b from-emerald-950/25 via-slate-900 to-slate-900 border-emerald-800/45 hover:border-emerald-600/70 shadow-emerald-950/20'
    }`}>
      
      <div>
        {/* Top bar: Code, Project, State Badge (RED = TO DO / GREEN = COMPLETED), Priority & Delete */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Code */}
            <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md border ${
              isPending 
                ? 'bg-rose-950/50 text-rose-200 border-rose-700/50' 
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

            {/* MAIN STATUS BADGE (RED = TO DO, GREEN = COMPLETED) */}
            {isPending ? (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>TO DO {intervention.status === 'in_progress' || intervention.status === 'in_corso' ? '(In Progress)' : ''}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>COMPLETED</span>
              </span>
            )}

            {/* Priority */}
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityBadge}`}>
              {intervention.priority}
            </span>
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
          isPending
            ? 'bg-rose-950/20 border-rose-900/40 text-rose-100/90'
            : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-100/90'
        }`}>
          <div className="flex items-start gap-1.5">
            <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isPending ? 'text-rose-400' : 'text-emerald-400'}`} />
            <div>
              <span className="font-semibold text-white">{intervention.siteName}</span>
              {intervention.siteAddress && (
                <div className="text-[11px] text-slate-400">{intervention.siteAddress}</div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div className="flex items-start gap-1.5">
              <User className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isPending ? 'text-rose-400' : 'text-emerald-400'}`} />
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
            isPending 
              ? 'bg-slate-800/80 text-rose-200 border-rose-800/40' 
              : 'bg-slate-800/80 text-emerald-200 border-emerald-800/40'
          }`}>
            <Calendar className={`w-3.5 h-3.5 ${isPending ? 'text-rose-400' : 'text-emerald-400'}`} />
            <span>Date: <strong>{intervention.desiredAccessDate}</strong></span>
          </div>
          {intervention.desiredAccessTime && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
              isPending 
                ? 'bg-slate-800/80 text-rose-200 border-rose-800/40' 
                : 'bg-slate-800/80 text-emerald-200 border-emerald-800/40'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${isPending ? 'text-rose-400' : 'text-emerald-400'}`} />
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

            {/* Download PDF button inside report */}
            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => downloadInterventionPDF(intervention)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40 transition active:scale-95"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download PDF Report</span>
              </button>

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
        isPending ? 'border-rose-900/40' : 'border-emerald-900/40'
      }`}>
        
        {/* Left side: assigned technician info */}
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Shield className={`w-3.5 h-3.5 ${isPending ? 'text-rose-400' : 'text-emerald-400'}`} />
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
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{isCompleted ? 'Edit Report' : 'Execute & Complete'}</span>
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
