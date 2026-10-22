import React, { useState } from 'react';
import { 
  Calendar, Clock, MapPin, User, Phone, AlertTriangle, 
  CheckCircle2, Wrench, FileDown, MessageSquare, Star, 
  Trash2, Image as ImageIcon, Shield, FolderKanban, AlertCircle,
  PhoneCall, MessageCircle, Share2, Mail, Camera, ClipboardList, CheckSquare, Square, Plus,
  Hourglass, ArrowRight, FileText
} from 'lucide-react';
import { InterventionRequest, AppRole, DefectPhoto, FollowUpChannel, ProjectTrackingEntry } from '../types';
import { getTelUri, getClientWhatsAppUri, getTicketShareWhatsAppUri } from '../lib/contactUtils';

const handleDownloadPDF = async (intervention: InterventionRequest) => {
  const { downloadInterventionPDF } = await import('../lib/pdfGenerator');
  downloadInterventionPDF(intervention);
};

const handleSharePDF = async (intervention: InterventionRequest) => {
  const { shareInterventionPDFViaWhatsApp } = await import('../lib/pdfGenerator');
  await shareInterventionPDFViaWhatsApp(intervention);
};

interface InterventionCardProps {
  intervention: InterventionRequest;
  currentRole: AppRole;
  currentUserName: string;
  onTakeCharge: (id: string, technicianName: string) => void;
  onOpenReportModal: (intervention: InterventionRequest) => void;
  onOpenFeedbackModal: (intervention: InterventionRequest) => void;
  onPreviewPhoto: (photo: DefectPhoto) => void;
  onDelete: (id: string) => void;
  onToggleActionStep?: (interventionId: string, stepId: string) => void;
  onAddActionStep?: (interventionId: string, text: string) => void;
  onDeleteActionStep?: (interventionId: string, stepId: string) => void;
  onAddTrackingEntry?: (interventionId: string, entry: Omit<ProjectTrackingEntry, 'id'>) => void;
  onMarkReplyReceived?: (interventionId: string, trackingId?: string) => void;
  onDeleteTrackingEntry?: (interventionId: string, trackingId: string) => void;
}

const getChannelBadgeInfo = (channel?: FollowUpChannel) => {
  switch (channel) {
    case 'email':
      return { label: 'Seguito per Email', short: 'Email', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/40', icon: 'email' };
    case 'whatsapp':
      return { label: 'Seguito per WhatsApp', short: 'WhatsApp', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: 'whatsapp' };
    case 'phone':
      return { label: 'Seguito per Telefono', short: 'Telefono', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: 'phone' };
    case 'meeting':
      return { label: 'Riunione / Call', short: 'Riunione', cls: 'bg-violet-500/20 text-violet-300 border-violet-500/40', icon: 'meeting' };
    default:
      return { label: 'Eseguito in Cantiere', short: 'Cantiere', cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', icon: 'on_site' };
  }
};

export const InterventionCard: React.FC<InterventionCardProps> = React.memo(({
  intervention,
  currentRole,
  currentUserName,
  onTakeCharge,
  onOpenReportModal,
  onOpenFeedbackModal,
  onPreviewPhoto,
  onDelete,
  onToggleActionStep,
  onAddActionStep,
  onDeleteActionStep,
  onAddTrackingEntry,
  onMarkReplyReceived,
  onDeleteTrackingEntry,
}) => {
  const [quickStepText, setQuickStepText] = useState('');
  const [showAddStepInput, setShowAddStepInput] = useState(false);

  // Tracking form state
  const [showAddTrackingForm, setShowAddTrackingForm] = useState(false);
  const [trkWhatIDid, setTrkWhatIDid] = useState('');
  const [trkChannel, setTrkChannel] = useState<FollowUpChannel>('email');
  const [trkDate, setTrkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [trkWaitingFrom, setTrkWaitingFrom] = useState('');
  const [trkDueDate, setTrkDueDate] = useState('');
  const [trkNextStep, setTrkNextStep] = useState('');
  const [trkRefDoc, setTrkRefDoc] = useState('');

  const isProjectWork = intervention.recordType === 'project_work';
  const actionSteps = intervention.actionSteps || [];
  const trackingLogs = intervention.trackingLogs || [];
  const activeWaitingFrom =
    intervention.waitingReplyFrom ||
    trackingLogs.find(t => t.awaitingReply && !t.replyReceived)?.waitingReplyFrom;
  const completedStepsCount = actionSteps.filter(s => s.completed).length;
  const stepsProgressPct = actionSteps.length > 0 ? Math.round((completedStepsCount / actionSteps.length) * 100) : 0;
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

            {/* Lavoro / Azione Progetto Badge */}
            {isProjectWork && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1 shadow-sm">
                <ClipboardList className="w-3 h-3 text-indigo-400" />
                <span>LAVORO / AZIONE</span>
              </span>
            )}

            {/* Badge Canale Ultimo Follow-up (Email / WhatsApp / ecc.) */}
            {intervention.followUpChannel && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${getChannelBadgeInfo(intervention.followUpChannel).cls}`}>
                {intervention.followUpChannel === 'email' && <Mail className="w-3 h-3" />}
                {intervention.followUpChannel === 'whatsapp' && <MessageCircle className="w-3 h-3" />}
                {intervention.followUpChannel === 'phone' && <Phone className="w-3 h-3" />}
                {intervention.followUpChannel === 'on_site' && <Wrench className="w-3 h-3" />}
                {intervention.followUpChannel === 'meeting' && <User className="w-3 h-3" />}
                <span>{getChannelBadgeInfo(intervention.followUpChannel).label}</span>
              </span>
            )}

            {/* MAIN STATUS BADGE (PINK = WORKING IN PROGRESS / WAITING FOR PARTS, AMBER = IN PROGRESS, RED = TO DO, GREEN = COMPLETED) */}
            {isCompleted ? (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>COMPLETED</span>
              </span>
            ) : isWaitingForParts && !isProjectWork ? (
              <span className="flex items-center gap-1.5 text-xs font-black px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/50 shadow-sm shadow-pink-950/40">
                <Clock className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                <span>WORKING IN PROGRESS (Waiting for Parts)</span>
              </span>
            ) : isInProgress ? (
              <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>{isProjectWork ? 'IN CORSO' : 'WORKING IN PROGRESS'}</span>
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

        {/* Title — High-contrast highlighted banner that stands out from the dark card background */}
        <div
          className={`mb-3 px-3.5 py-2.5 rounded-xl border-l-4 shadow-md transition ${
            isCompleted
              ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-900/20 to-slate-900/80 border-l-emerald-400 ring-1 ring-emerald-400/30'
              : 'bg-gradient-to-r from-yellow-500/25 via-amber-500/15 to-slate-900/85 border-l-yellow-400 ring-1 ring-yellow-400/40 shadow-yellow-950/30'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <span className={isCompleted ? 'text-emerald-400' : 'text-yellow-400'}>
              {isProjectWork ? '📌 TASK / LAVORO PROGETTO:' : '📌 TASK / INTERVENTO:'}
            </span>
          </div>
          <h3
            className={`text-base sm:text-lg font-extrabold leading-snug tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] ${
              isCompleted ? 'text-emerald-200' : 'text-yellow-300'
            }`}
          >
            {intervention.title}
          </h3>
        </div>

        {!isProjectWork && (
          <>
            {/* Site & Client Meta info (Only for Interventi / Guasti) */}
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
          </>
        )}

        {/* Dedicated Quick Summary Header for Lavori & Azioni Progetto */}
        {isProjectWork && (
          <div className="mb-3 p-3 rounded-xl bg-indigo-950/25 border border-indigo-800/50 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-indigo-200 border border-indigo-700/50 font-mono text-[11px]">
                  <Calendar className="w-3 h-3 text-indigo-400" />
                  <span>Data: <strong>{intervention.lastActionDate || intervention.desiredAccessDate}</strong></span>
                </span>
                {intervention.followUpChannel && (
                  <span className={`px-2 py-0.5 rounded-md border font-bold text-[11px] flex items-center gap-1 ${getChannelBadgeInfo(intervention.followUpChannel).cls}`}>
                    {intervention.followUpChannel === 'email' && <Mail className="w-3 h-3" />}
                    {intervention.followUpChannel === 'whatsapp' && <MessageCircle className="w-3 h-3" />}
                    {intervention.followUpChannel === 'phone' && <Phone className="w-3 h-3" />}
                    {intervention.followUpChannel === 'on_site' && <Wrench className="w-3 h-3" />}
                    {intervention.followUpChannel === 'meeting' && <User className="w-3 h-3" />}
                    <span>{getChannelBadgeInfo(intervention.followUpChannel).label}</span>
                  </span>
                )}
              </div>

              {intervention.clientContact && (
                <div className="flex items-center gap-1.5">
                  {getTelUri(intervention.clientContact) && (
                    <a
                      href={getTelUri(intervention.clientContact)!}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/35 text-[11px] font-semibold transition"
                    >
                      <PhoneCall className="w-3 h-3 text-blue-400" />
                      <span>Chiama</span>
                    </a>
                  )}
                  <a
                    href={getClientWhatsAppUri(intervention)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition"
                  >
                    <MessageCircle className="w-3 h-3 text-emerald-400" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              )}
            </div>

            <div className="text-slate-200 leading-relaxed">
              <strong className="text-indigo-300">🛠️ Cosa ho fatto / Attività: </strong>
              <span>{intervention.whatIDidSummary || intervention.description}</span>
            </div>
          </div>
        )}

        {/* Notes (Multiline) */}
        {intervention.notes && (
          <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 mb-3 whitespace-pre-wrap leading-relaxed">
            <strong className="text-slate-400 block mb-0.5 text-[11px]">Notes for technician:</strong>
            {intervention.notes}
          </div>
        )}

        {/* ⏳ BANNER EVIDENZIATO: DA CHI ASPETTO RISPOSTA */}
        {activeWaitingFrom && !isCompleted && (
          <div className="mb-3 p-3 rounded-xl bg-amber-950/35 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                <Hourglass className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                <span>Da chi aspetto risposta: <strong className="text-white underline decoration-amber-400/60">{activeWaitingFrom}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-amber-200/80 flex-wrap">
                {intervention.lastActionDate && (
                  <span>📅 Richiesto il: <strong>{intervention.lastActionDate}</strong></span>
                )}
                {intervention.followUpChannel && (
                  <span>📡 Tramite: <strong>{getChannelBadgeInfo(intervention.followUpChannel).short}</strong></span>
                )}
                {intervention.followUpDueDate && (
                  <span className="text-amber-300 font-semibold">⏰ Scadenza / Sollecito: {intervention.followUpDueDate}</span>
                )}
              </div>
            </div>
            {onMarkReplyReceived && (
              <button
                type="button"
                onClick={() => onMarkReplyReceived(intervention.id)}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition active:scale-95 shrink-0"
                title="Segna che la risposta attesa è arrivata"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Risposta Ricevuta</span>
              </button>
            )}
          </div>
        )}

        {/* 📡 DIARIO TRACKING PROGETTO: COSA HO FATTO, SEGUITO PER EMAIL/WHATSAPP, DATA, DA CHI ASPETTO RISPOSTA */}
        {(isProjectWork || trackingLogs.length > 0 || intervention.whatIDidSummary) && (
          <div className="bg-slate-950/80 border border-indigo-700/50 rounded-xl p-3 mb-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tracking Lavoro: Cosa ho fatto, Email/WhatsApp & Risposte ({trackingLogs.length})</span>
              </div>
              {onAddTrackingEntry && (
                <button
                  type="button"
                  onClick={() => setShowAddTrackingForm(prev => !prev)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center gap-1 transition active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showAddTrackingForm ? 'Chiudi Form' : '+ Registra Cosa Ho Fatto / Follow-up'}</span>
                </button>
              )}
            </div>

            {/* Sintesi rapida ultimo stato e Prossima Azione */}
            {(intervention.whatIDidSummary || intervention.nextActionToDo) && (
              <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-800/50 text-xs space-y-1">
                {intervention.whatIDidSummary && (
                  <div className="text-slate-200">
                    <span className="font-bold text-indigo-300">🛠️ Ultima azione fatta: </span>
                    <span>{intervention.whatIDidSummary}</span>
                  </div>
                )}
                {intervention.nextActionToDo && (
                  <div className="text-emerald-300 flex items-start gap-1">
                    <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                    <span><strong>Prossima azione da fare:</strong> {intervention.nextActionToDo}</span>
                  </div>
                )}
              </div>
            )}

            {/* Form rapido inline per aggiungere una voce di Tracking */}
            {showAddTrackingForm && onAddTrackingEntry && (
              <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/50 space-y-2.5 animate-fadeIn">
                <div className="text-xs font-bold text-indigo-300">
                  Nuova Voce di Tracking (Cosa ho fatto, Email/WhatsApp, Data, Da chi aspetto risposta)
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Cosa ho fatto *
                  </label>
                  <textarea
                    rows={2}
                    value={trkWhatIDid}
                    onChange={(e) => setTrkWhatIDid(e.target.value)}
                    placeholder="Descrivi cosa hai fatto (es. Inviato schema, scritto su WhatsApp per accesso, eseguita modifica ETS...)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Seguito per (Email / WhatsApp / ecc.)
                    </label>
                    <select
                      value={trkChannel}
                      onChange={(e) => setTrkChannel(e.target.value as FollowUpChannel)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      <option value="email">✉️ Seguito per Email</option>
                      <option value="whatsapp">💬 Seguito per WhatsApp</option>
                      <option value="phone">📞 Seguito per Telefono</option>
                      <option value="on_site">🏗️ Eseguito in Cantiere</option>
                      <option value="meeting">👥 Riunione / Call Tecnica</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={trkDate}
                      onChange={(e) => setTrkDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                      ⏳ Da chi aspetto risposta? (opz.)
                    </label>
                    <input
                      type="text"
                      value={trkWaitingFrom}
                      onChange={(e) => setTrkWaitingFrom(e.target.value)}
                      placeholder="Es. Mario Rossi, Ing. Bianchi, Fornitore..."
                      className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-300 mb-1">
                      ⏰ Data entro cui sollecitare (opz.)
                    </label>
                    <input
                      type="date"
                      value={trkDueDate}
                      onChange={(e) => setTrkDueDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-300 mb-1">
                      ➡️ Prossima azione da fare (opz.)
                    </label>
                    <input
                      type="text"
                      value={trkNextStep}
                      onChange={(e) => setTrkNextStep(e.target.value)}
                      placeholder="Es. Collaudo in campo dopo conferma..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      📎 Rif. Documento / Schema / Prev. (opz.)
                    </label>
                    <input
                      type="text"
                      value={trkRefDoc}
                      onChange={(e) => setTrkRefDoc(e.target.value)}
                      placeholder="Es. Schema_QG.pdf, Prev. #12..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddTrackingForm(false)}
                    className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-800"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!trkWhatIDid.trim()) {
                        alert('Inserisci cosa hai fatto prima di salvare il tracking.');
                        return;
                      }
                      onAddTrackingEntry(intervention.id, {
                        date: trkDate || new Date().toISOString().split('T')[0],
                        time: new Date().toTimeString().slice(0, 5),
                        whatIDid: trkWhatIDid.trim(),
                        channel: trkChannel,
                        awaitingReply: Boolean(trkWaitingFrom.trim()),
                        waitingReplyFrom: trkWaitingFrom.trim() || undefined,
                        followUpDueDate: trkDueDate || undefined,
                        nextStep: trkNextStep.trim() || undefined,
                        referenceDoc: trkRefDoc.trim() || undefined,
                      });
                      setTrkWhatIDid('');
                      setTrkWaitingFrom('');
                      setTrkDueDate('');
                      setTrkNextStep('');
                      setTrkRefDoc('');
                      setShowAddTrackingForm(false);
                    }}
                    className="px-3.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
                  >
                    Salva nel Tracking
                  </button>
                </div>
              </div>
            )}

            {/* Lista Cronologica del Tracking */}
            {trackingLogs.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">
                Nessun movimento registrato. Premi "+ Registra Cosa Ho Fatto / Follow-up" per tracciare attività, email, WhatsApp e risposte attese.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {trackingLogs.map((log) => {
                  const chInfo = getChannelBadgeInfo(log.channel);
                  return (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-900/95 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                            📅 {log.date}{log.time ? ` ${log.time}` : ''}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${chInfo.cls}`}>
                            {log.channel === 'email' && <Mail className="w-3 h-3" />}
                            {log.channel === 'whatsapp' && <MessageCircle className="w-3 h-3" />}
                            {log.channel === 'phone' && <Phone className="w-3 h-3" />}
                            {log.channel === 'on_site' && <Wrench className="w-3 h-3" />}
                            {log.channel === 'meeting' && <User className="w-3 h-3" />}
                            <span>{chInfo.label}</span>
                          </span>
                          {log.referenceDoc && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                              <FileText className="w-2.5 h-2.5 text-indigo-400" />
                              <span>{log.referenceDoc}</span>
                            </span>
                          )}
                        </div>

                        {onDeleteTrackingEntry && (
                          <button
                            type="button"
                            onClick={() => onDeleteTrackingEntry(intervention.id, log.id)}
                            className="text-slate-500 hover:text-rose-400 p-0.5 transition"
                            title="Elimina voce di tracking"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="text-slate-100 leading-relaxed">
                        <strong className="text-indigo-300">Cosa ho fatto: </strong>
                        <span>{log.whatIDid}</span>
                      </div>

                      {log.waitingReplyFrom && (
                        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            log.replyReceived
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
                              : 'bg-amber-950/40 text-amber-300 border-amber-600/50'
                          }`}>
                            <Hourglass className="w-3 h-3 shrink-0" />
                            <span>
                              {log.replyReceived
                                ? `✅ Risposta ricevuta da: ${log.waitingReplyFrom}${log.replyReceivedAt ? ` (${log.replyReceivedAt})` : ''}`
                                : `⏳ Aspetto risposta da: ${log.waitingReplyFrom}${log.followUpDueDate ? ` (entro ${log.followUpDueDate})` : ''}`}
                            </span>
                          </div>

                          {!log.replyReceived && onMarkReplyReceived && (
                            <button
                              type="button"
                              onClick={() => onMarkReplyReceived(intervention.id, log.id)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 transition"
                            >
                              ✓ Segna Risposta Ricevuta
                            </button>
                          )}
                        </div>
                      )}

                      {log.nextStep && (
                        <div className="text-[11px] text-emerald-300/90 flex items-center gap-1 pt-0.5">
                          <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span><strong>Prossimo step:</strong> {log.nextStep}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 📋 CHECKLIST AZIONI DA FARE SUL PROGETTO / LAVORO */}
        {(isProjectWork || actionSteps.length > 0) && (
          <div className="bg-indigo-950/25 border border-indigo-700/50 rounded-xl p-3 mb-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                <span>Azioni da Fare sul Progetto ({completedStepsCount}/{actionSteps.length})</span>
              </div>
              <div className="flex items-center gap-2">
                {actionSteps.length > 0 && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    stepsProgressPct === 100
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  }`}>
                    {stepsProgressPct}% completato
                  </span>
                )}
                {onAddActionStep && (
                  <button
                    type="button"
                    onClick={() => setShowAddStepInput(prev => !prev)}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 flex items-center gap-1 transition active:scale-95"
                    title="Aggiungi una nuova azione da fare su questo lavoro"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Azione</span>
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {actionSteps.length > 0 && (
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    stepsProgressPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${stepsProgressPct}%` }}
                />
              </div>
            )}

            {/* Quick Add Step Input */}
            {showAddStepInput && onAddActionStep && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <input
                  type="text"
                  value={quickStepText}
                  onChange={(e) => setQuickStepText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (quickStepText.trim()) {
                        onAddActionStep(intervention.id, quickStepText.trim());
                        setQuickStepText('');
                      }
                    }
                  }}
                  placeholder="Scrivi nuova azione da fare e premi Invio..."
                  className="flex-1 bg-slate-900 border border-indigo-600/60 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (quickStepText.trim()) {
                      onAddActionStep(intervention.id, quickStepText.trim());
                      setQuickStepText('');
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                >
                  Salva
                </button>
              </div>
            )}

            {/* Action Steps List */}
            {actionSteps.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">
                Nessuna sotto-azione inserita. Clicca "+ Azione" per aggiungere i passaggi operativi da spuntare.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {actionSteps.map((step) => (
                  <div
                    key={step.id}
                    onClick={() => onToggleActionStep && onToggleActionStep(intervention.id, step.id)}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      step.completed
                        ? 'bg-emerald-950/30 border-emerald-800/50 text-slate-400 line-through'
                        : 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/60 text-slate-100'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {step.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug break-words">{step.text}</span>
                    </div>
                    {onDeleteActionStep && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteActionStep(intervention.id, step.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition shrink-0"
                        title="Elimina azione"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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

        {/* Screenshot / Photos Thumbnails */}
        {intervention.defectPhotos && intervention.defectPhotos.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
              <ImageIcon className={`w-3.5 h-3.5 ${isPending ? 'text-rose-400' : 'text-emerald-400'}`} />
              <span>Screenshot ({intervention.defectPhotos.length}):</span>
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
                    loading="lazy"
                    decoding="async"
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
                    loading="lazy"
                    decoding="async"
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
                  onClick={() => handleDownloadPDF(intervention)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-900/40 transition active:scale-95"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Interim PDF</span>
                </button>
                <button
                  onClick={() => handleSharePDF(intervention)}
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
                  onClick={() => handleDownloadPDF(intervention)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40 transition active:scale-95"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => handleSharePDF(intervention)}
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
              onClick={() => handleDownloadPDF(intervention)}
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
});
