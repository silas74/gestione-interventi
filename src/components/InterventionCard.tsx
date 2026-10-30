import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  FileDown,
  MessageSquare,
  Star,
  Trash2,
  Image as ImageIcon,
  Shield,
  FolderKanban,
  AlertCircle,
  PhoneCall,
  MessageCircle,
  Share2,
  Mail,
  Camera,
  ClipboardList,
  CheckSquare,
  Square,
  Plus,
  Hourglass,
  ArrowRight,
  FileText,
  Pencil,
  Package,
  Truck,
  Check,
  X,
  BellRing,
  ShoppingCart,
  Building2,
  Bookmark,
  Paperclip,
} from 'lucide-react';
import {
  InterventionRequest,
  AppRole,
  DefectPhoto,
  FollowUpChannel,
  ProjectTrackingEntry,
  SupplyStatus,
  InterventionPriority,
  InterventionStatus,
} from '../types';
import { getTelUri, getClientWhatsAppUri, getTicketShareWhatsAppUri } from '../lib/contactUtils';

const SUPPLY_STEPS: { id: SupplyStatus; label: string; short: string }[] = [
  { id: 'none', label: 'Nessun ordine', short: 'Nessuno' },
  { id: 'ordered', label: 'Ordinato', short: 'Ordinato' },
  { id: 'shipping', label: 'In arrivo', short: 'In arrivo' },
  { id: 'ready_pickup', label: 'Da ritirare', short: 'Da ritirare' },
  { id: 'delivered', label: 'In cantiere', short: 'In cantiere' },
];

const renderSupplyIcon = (status: SupplyStatus) => {
  switch (status) {
    case 'ordered':
      return <ShoppingCart className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />;
    case 'shipping':
      return <Truck className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />;
    case 'ready_pickup':
      return <Package className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />;
    case 'delivered':
      return <Building2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />;
    default:
      return null;
  }
};

const getWaitingDaysInfo = (lastActionDate?: string, followUpDueDate?: string, createdAt?: string) => {
  const refDateStr = lastActionDate || (createdAt ? createdAt.split('T')[0] : undefined);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysWaiting = 0;
  if (refDateStr) {
    const d = new Date(refDateStr);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      daysWaiting = Math.max(0, Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  let isOverdue = false;
  if (followUpDueDate) {
    const due = new Date(followUpDueDate);
    if (!isNaN(due.getTime())) {
      due.setHours(0, 0, 0, 0);
      isOverdue = today.getTime() > due.getTime();
    }
  }

  const isAlert = isOverdue || daysWaiting >= 3;
  const label = daysWaiting === 0 ? 'oggi' : daysWaiting === 1 ? 'da 1 giorno' : `da ${daysWaiting} giorni`;
  return { daysWaiting, isOverdue, isAlert, label };
};

const getReminderWhatsAppUri = (intervention: InterventionRequest, waitingFrom: string, daysWaiting: number) => {
  const phoneDigits = (intervention.clientContact || '').replace(/[^\d+]/g, '');
  const cleanPhone = phoneDigits.startsWith('+') ? phoneDigits.slice(1) : phoneDigits;
  const msg =
    `Gentile ${waitingFrom},\n` +
    `ti scrivo per un gentile riscontro in merito a:\n` +
    `- ${intervention.title} (${intervention.projectName || intervention.siteName || intervention.code})\n` +
    (intervention.lastActionDate ? `- Inviato il: ${intervention.lastActionDate}${daysWaiting > 0 ? ` (${daysWaiting} gg fa)` : ''}\n` : '') +
    (intervention.whatIDidSummary ? `- Dettaglio: ${intervention.whatIDidSummary}\n` : '') +
    `\nResto in attesa di un tuo cortese feedback per procedere.\nGrazie, Pierluigi`;
  const encoded = encodeURIComponent(msg);
  return cleanPhone.length >= 6
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
};

const getReminderMailtoUri = (intervention: InterventionRequest, waitingFrom: string, daysWaiting: number) => {
  const contact = (intervention.clientContact || '').trim();
  const emailTo = contact.includes('@') ? contact : '';
  const subject = `Sollecito / Follow-up: ${intervention.projectName ? `[${intervention.projectName}] ` : ''}${intervention.title} (${intervention.code})`;
  const body =
    `Gentile ${waitingFrom},\n\n` +
    `Ti scrivo per un cortese aggiornamento / riscontro in merito a:\n` +
    `- Progetto: ${intervention.projectName || intervention.siteName || '-'}\n` +
    `- Oggetto: ${intervention.title} (${intervention.code})\n` +
    (intervention.lastActionDate ? `- Data richiesta: ${intervention.lastActionDate}${daysWaiting > 0 ? ` (${daysWaiting} giorni fa)` : ''}\n` : '') +
    (intervention.whatIDidSummary ? `- Attività / Dettaglio: ${intervention.whatIDidSummary}\n` : '') +
    (intervention.nextActionToDo ? `- Prossima azione prevista: ${intervention.nextActionToDo}\n` : '') +
    `\nResto in attesa di un tuo gentile riscontro.\n\nCordiali saluti,\nPierluigi`;
  return `mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

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
  onQuickUpdate?: (interventionId: string, updates: Partial<InterventionRequest>) => void;
}

const getChannelBadgeInfo = (channel?: FollowUpChannel) => {
  switch (channel) {
    case 'email':
      return { label: 'Seguito per email', short: 'Email' };
    case 'whatsapp':
      return { label: 'Seguito su WhatsApp', short: 'WhatsApp' };
    case 'phone':
      return { label: 'Seguito per telefono', short: 'Telefono' };
    case 'meeting':
      return { label: 'Riunione tecnica', short: 'Riunione' };
    default:
      return { label: 'Eseguito in cantiere', short: 'Cantiere' };
  }
};

const formatPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'urgent':
    case 'urgente':
      return 'Priorità urgente';
    case 'high':
    case 'alta':
      return 'Priorità alta';
    case 'medium':
    case 'media':
      return 'Priorità media';
    default:
      return 'Priorità bassa';
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
  onQuickUpdate,
}) => {
  const [quickStepText, setQuickStepText] = useState('');
  const [showAddStepInput, setShowAddStepInput] = useState(false);

  // Quick inline edit state
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [editTitle, setEditTitle] = useState(intervention.title);
  const [editWhatIDid, setEditWhatIDid] = useState(intervention.whatIDidSummary || intervention.description || '');
  const [editWaitingFrom, setEditWaitingFrom] = useState(intervention.waitingReplyFrom || '');
  const [editContact, setEditContact] = useState(intervention.clientContact || '');
  const [editNextStep, setEditNextStep] = useState(intervention.nextActionToDo || '');
  const [editDueDate, setEditDueDate] = useState(intervention.followUpDueDate || '');
  const [editPriority, setEditPriority] = useState<InterventionPriority>(intervention.priority);
  const [editStatus, setEditStatus] = useState<InterventionStatus>(intervention.status);
  const [editSupplyStatus, setEditSupplyStatus] = useState<SupplyStatus>(intervention.supplyStatus || 'none');

  const handleOpenQuickEdit = () => {
    setEditTitle(intervention.title);
    setEditWhatIDid(intervention.whatIDidSummary || intervention.description || '');
    setEditWaitingFrom(
      intervention.waitingReplyFrom ||
        (intervention.trackingLogs || []).find((t) => t.awaitingReply && !t.replyReceived)?.waitingReplyFrom ||
        ''
    );
    setEditContact(intervention.clientContact || '');
    setEditNextStep(intervention.nextActionToDo || '');
    setEditDueDate(intervention.followUpDueDate || '');
    setEditPriority(intervention.priority);
    setEditStatus(intervention.status);
    setEditSupplyStatus(intervention.supplyStatus || 'none');
    setIsEditingCard(true);
  };

  const handleSaveQuickEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onQuickUpdate) return;
    const trimmedTitle = editTitle.trim() || intervention.title;
    const trimmedWhat = editWhatIDid.trim();
    const trimmedWaiting = editWaitingFrom.trim();
    onQuickUpdate(intervention.id, {
      title: trimmedTitle,
      whatIDidSummary: trimmedWhat || undefined,
      description: trimmedWhat || intervention.description,
      waitingReplyFrom: trimmedWaiting || undefined,
      clientName: trimmedWaiting || intervention.clientName,
      clientContact: editContact.trim() || undefined,
      nextActionToDo: editNextStep.trim() || undefined,
      followUpDueDate: editDueDate || undefined,
      priority: editPriority,
      status: editStatus,
      supplyStatus: editSupplyStatus,
    });
    setIsEditingCard(false);
  };

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
  const currentSupplyStatus: SupplyStatus = intervention.supplyStatus || 'none';
  const actionSteps = intervention.actionSteps || [];
  const trackingLogs = intervention.trackingLogs || [];
  const activeWaitingFrom =
    intervention.waitingReplyFrom ||
    trackingLogs.find((t) => t.awaitingReply && !t.replyReceived)?.waitingReplyFrom;
  const waitingDaysInfo = getWaitingDaysInfo(
    intervention.lastActionDate,
    intervention.followUpDueDate,
    intervention.createdAt
  );
  const completedStepsCount = actionSteps.filter((s) => s.completed).length;
  const stepsProgressPct = actionSteps.length > 0 ? Math.round((completedStepsCount / actionSteps.length) * 100) : 0;
  const isCompleted = intervention.status === 'completed' || intervention.status === 'completato';
  const isPending = !isCompleted;
  const isWaiting = intervention.status === 'pending' || intervention.status === 'in_attesa';
  const isUrgent = intervention.priority === 'urgent' || intervention.priority === 'urgente';
  const isWaitingForParts =
    intervention.report?.statusOutcome === 'waiting_for_parts' ||
    (intervention.report?.statusOutcome as string) === 'in_attesa_ricambi';
  const isInProgress = (intervention.status === 'in_progress' || intervention.status === 'in_corso') && !isCompleted;

  const isAdmin = currentRole === 'admin';
  const isTechOrAdmin = currentRole === 'admin' || currentRole === 'technician' || currentRole === 'tecnico';

  return (
    <div
      className={`rounded-lg p-6 bg-zinc-900 flex flex-col justify-between border transition ${
        isUrgent && isPending ? 'border-zinc-500' : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div>
        {/* Urgent Banner — Neutral palette, zero glow */}
        {isUrgent && isPending && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-600 flex items-center justify-between text-xs font-semibold text-zinc-100">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-zinc-200 shrink-0" strokeWidth={1.75} />
              <span>Priorità urgente — Azione richiesta</span>
            </span>
            <span className="font-mono text-xs font-normal text-zinc-300">Intervento prioritario</span>
          </div>
        )}

        {/* Top bar: Code, Project, State, Priority & Quick actions */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Code */}
            <span className="font-mono imp-tabular text-xs font-semibold px-2 py-1 rounded bg-zinc-950 text-zinc-200 border border-zinc-800">
              {intervention.code}
            </span>

            {/* Project Badge */}
            {intervention.projectName && (
              <span className="text-xs font-semibold px-2 py-1 rounded bg-zinc-950 text-zinc-200 border border-zinc-800 flex items-center gap-2">
                <FolderKanban className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span>{intervention.projectName}</span>
              </span>
            )}

            {/* Lavoro / Azione Progetto Badge */}
            {isProjectWork && (
              <span className="text-xs font-normal px-2 py-1 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span>Lavoro progetto</span>
              </span>
            )}

            {/* Follow-up Channel */}
            {intervention.followUpChannel && (
              <span className="text-xs font-normal px-2 py-1 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 flex items-center gap-2">
                {intervention.followUpChannel === 'email' && <Mail className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                {intervention.followUpChannel === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                {intervention.followUpChannel === 'phone' && <Phone className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                {intervention.followUpChannel === 'on_site' && <Wrench className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                {intervention.followUpChannel === 'meeting' && <User className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                <span>{getChannelBadgeInfo(intervention.followUpChannel).label}</span>
              </span>
            )}

            {/* Main Status Badge */}
            {isCompleted ? (
              <span className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded bg-zinc-950 text-zinc-200 border border-zinc-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span>Completato</span>
              </span>
            ) : isWaitingForParts && !isProjectWork ? (
              <span className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded bg-zinc-950 text-zinc-200 border border-zinc-700">
                <Clock className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span>In lavorazione (attesa ricambi)</span>
              </span>
            ) : isInProgress ? (
              <span className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded bg-zinc-950 text-zinc-200 border border-zinc-800">
                <Wrench className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span>In corso</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded bg-zinc-950 text-zinc-200 border border-zinc-800">
                <AlertCircle className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span>Da fare</span>
              </span>
            )}

            {/* Priority */}
            <span className="text-xs font-normal px-2 py-1 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 flex items-center gap-2">
              {isUrgent && isPending && <AlertTriangle className="w-3.5 h-3.5 text-zinc-300" strokeWidth={1.75} />}
              <span>{formatPriorityLabel(intervention.priority)}</span>
            </span>

            {/* Inbound Email Source Badge */}
            {intervention.emailSource && (
              <span
                className="text-xs font-normal px-2 py-1 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 flex items-center gap-2"
                title={`Ricevuto via email da ${intervention.emailSource.sender} il ${intervention.emailSource.receivedAt}`}
              >
                <Mail className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span>Email</span>
              </span>
            )}
          </div>

          {/* Top Quick Actions: Edit + WhatsApp Share + Delete */}
          <div className="flex items-center gap-2">
            {onQuickUpdate && (
              <button
                type="button"
                onClick={() => (isEditingCard ? setIsEditingCard(false) : handleOpenQuickEdit())}
                className={`px-2 py-2 rounded-lg transition flex items-center gap-2 text-xs ${
                  isEditingCard
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'text-zinc-300 hover:text-zinc-100 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 font-normal'
                }`}
                title="Modifica rapida scheda"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span className="hidden sm:inline">{isEditingCard ? 'Chiudi' : 'Modifica'}</span>
              </button>
            )}

            <a
              href={getTicketShareWhatsAppUri(intervention)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-800 transition"
              title="Condividi riepilogo su WhatsApp"
            >
              <Share2 className="w-4 h-4" strokeWidth={1.75} />
            </a>

            {(isAdmin || isWaiting) && (
              <button
                onClick={() => onDelete(intervention.id)}
                className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-800 transition"
                title="Elimina richiesta"
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* Title Header Box — Neutral surface, zero gradient */}
        <div className="mb-4 p-4 rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="text-xs font-normal text-zinc-400 mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Bookmark className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
              <span>{isProjectWork ? 'Attività progetto' : 'Intervento tecnico'}</span>
            </span>
            {currentSupplyStatus !== 'none' && (
              <span className="px-2 py-1 rounded bg-zinc-900 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-2">
                {renderSupplyIcon(currentSupplyStatus)}
                <span>{SUPPLY_STEPS.find((s) => s.id === currentSupplyStatus)?.label}</span>
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-semibold leading-snug text-zinc-100">
            {intervention.title}
          </h3>
        </div>

        {/* Inline Quick Edit Form */}
        {isEditingCard && onQuickUpdate && (
          <form
            onSubmit={handleSaveQuickEdit}
            className="mb-4 p-4 rounded-lg bg-zinc-950 border border-zinc-700 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="font-semibold text-zinc-100 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                <span>Modifica rapida scheda ({intervention.code})</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingCard(false)}
                className="text-zinc-400 hover:text-zinc-100 p-2 rounded"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-normal text-zinc-400 mb-2">Titolo attività o lavoro *</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 font-semibold text-xs focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-zinc-400 mb-2">Cosa ho fatto / Dettaglio attività</label>
              <textarea
                rows={2}
                value={editWhatIDid}
                onChange={(e) => setEditWhatIDid(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 font-normal text-xs focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-normal text-zinc-400 mb-2">
                  <Hourglass className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                  <span>Da chi aspetto risposta</span>
                </label>
                <input
                  type="text"
                  value={editWaitingFrom}
                  onChange={(e) => setEditWaitingFrom(e.target.value)}
                  placeholder="Es. Aby, Franco, Dodic..."
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-normal text-zinc-400 mb-2">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                  <span>Telefono o email contatto</span>
                </label>
                <input
                  type="text"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  placeholder="+251... o email@..."
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-normal text-zinc-400 mb-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                  <span>Scadenza sollecito</span>
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-normal text-zinc-400 mb-2">
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                  <span>Prossima azione</span>
                </label>
                <input
                  type="text"
                  value={editNextStep}
                  onChange={(e) => setEditNextStep(e.target.value)}
                  placeholder="Prossimo passo..."
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div>
                <label className="block text-xs font-normal text-zinc-400 mb-2">Priorità</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as InterventionPriority)}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600"
                >
                  <option value="urgent">Urgente</option>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Bassa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-normal text-zinc-400 mb-2">Stato attività</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as InterventionStatus)}
                  className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-600"
                >
                  <option value="pending">Da fare / In attesa</option>
                  <option value="in_progress">In corso</option>
                  <option value="completed">Completato</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-normal text-zinc-400 mb-2">
                <Package className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span>Stato materiali e ordini</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {SUPPLY_STEPS.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setEditSupplyStatus(st.id)}
                    className={`px-2 py-2 rounded-lg text-xs border transition flex items-center justify-center gap-2 ${
                      editSupplyStatus === st.id
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 font-normal'
                    }`}
                  >
                    {renderSupplyIcon(st.id)}
                    <span>{st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingCard(false)}
                className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-normal"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold flex items-center gap-2"
              >
                <Check className="w-4 h-4" strokeWidth={1.75} />
                <span>Salva modifiche</span>
              </button>
            </div>
          </form>
        )}

        {!isProjectWork && (
          <>
            {/* Site & Client Meta info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-4 p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <span className="font-semibold text-zinc-100">{intervention.siteName}</span>
                  {intervention.siteAddress && (
                    <div className="text-xs text-zinc-400 mt-1">{intervention.siteAddress}</div>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="min-w-0">
                    <span className="font-semibold text-zinc-100 truncate block">{intervention.clientName}</span>
                    {intervention.clientContact && (
                      <div className="text-xs text-zinc-400 flex items-center gap-2 mt-1 truncate">
                        <Phone className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{intervention.clientContact}</span>
                      </div>
                    )}
                  </div>
                </div>

                {intervention.clientContact && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800 flex-wrap">
                    {getTelUri(intervention.clientContact) && (
                      <a
                        href={getTelUri(intervention.clientContact)!}
                        className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-normal transition"
                        title={`Chiama: ${intervention.clientContact}`}
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                        <span>Chiama</span>
                      </a>
                    )}
                    <a
                      href={getClientWhatsAppUri(intervention)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-normal transition"
                      title={`Chat WhatsApp con ${intervention.clientName}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Desired Access Date & Time */}
            <div className="flex items-center gap-4 text-xs mb-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 text-zinc-200 border border-zinc-800">
                <Calendar className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                <span>
                  Data: <strong className="font-semibold">{intervention.desiredAccessDate}</strong>
                </span>
              </div>
              {intervention.desiredAccessTime && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-950 text-zinc-200 border border-zinc-800">
                  <Clock className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  <span>
                    Ora: <strong className="font-semibold">{intervention.desiredAccessTime}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="text-xs text-zinc-300 mb-4 leading-relaxed">
              <span className="font-semibold text-zinc-100">Dettagli attività: </span>
              <span>{intervention.description}</span>
            </div>
          </>
        )}

        {/* Dedicated Quick Summary Header for Lavori & Azioni Progetto */}
        {isProjectWork && (
          <div className="mb-4 p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-4 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-900 text-zinc-200 border border-zinc-800 font-mono imp-tabular text-xs">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                  <span>
                    Data: <strong className="font-semibold">{intervention.lastActionDate || intervention.desiredAccessDate}</strong>
                  </span>
                </span>
                {intervention.followUpChannel && (
                  <span className="px-2 py-1 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 font-normal text-xs flex items-center gap-2">
                    {intervention.followUpChannel === 'email' && <Mail className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                    {intervention.followUpChannel === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                    {intervention.followUpChannel === 'phone' && <Phone className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                    {intervention.followUpChannel === 'on_site' && <Wrench className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                    {intervention.followUpChannel === 'meeting' && <User className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                    <span>{getChannelBadgeInfo(intervention.followUpChannel).label}</span>
                  </span>
                )}
              </div>

              {intervention.clientContact && (
                <div className="flex items-center gap-2">
                  {getTelUri(intervention.clientContact) && (
                    <a
                      href={getTelUri(intervention.clientContact)!}
                      className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-normal transition"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      <span>Chiama</span>
                    </a>
                  )}
                  <a
                    href={getClientWhatsAppUri(intervention)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-normal transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              )}
            </div>

            <div className="text-zinc-200 leading-relaxed flex items-start gap-2">
              <Wrench className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <strong className="font-semibold text-zinc-100">Cosa ho fatto / Attività: </strong>
                <span>{intervention.whatIDidSummary || intervention.description}</span>
              </div>
            </div>

            {/* Supply Status Stepper */}
            <div className="pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Package className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  <span>Stato materiali e fornitura</span>
                </span>
                {currentSupplyStatus !== 'none' && (
                  <span className="text-xs font-normal text-zinc-400 flex items-center gap-2">
                    <span>Clicca per aggiornare stato</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {SUPPLY_STEPS.map((st) => {
                  const isActive = currentSupplyStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      disabled={!onQuickUpdate}
                      onClick={() => onQuickUpdate && onQuickUpdate(intervention.id, { supplyStatus: st.id })}
                      className={`px-2 py-2 rounded-lg text-xs border transition flex items-center justify-center gap-2 truncate ${
                        isActive
                          ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 font-normal'
                      }`}
                      title={`Imposta stato materiale: ${st.label}`}
                    >
                      {renderSupplyIcon(st.id)}
                      <span className="truncate">{st.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {intervention.notes && (
          <div className="text-xs text-zinc-300 bg-zinc-950 p-4 rounded-lg border border-zinc-800 mb-4 whitespace-pre-wrap leading-relaxed">
            <strong className="font-semibold text-zinc-200 block mb-2">Note per il tecnico:</strong>
            {intervention.notes}
          </div>
        )}

        {/* Waiting Reply Banner + Days Counter + 1-Click Reminder */}
        {activeWaitingFrom && !isCompleted && (
          <div className="mb-4 p-4 rounded-lg bg-zinc-950 border border-zinc-700 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 flex-wrap">
                  <Hourglass className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
                  <span>
                    Da chi aspetto risposta: <strong className="font-semibold text-zinc-100 underline">{activeWaitingFrom}</strong>
                  </span>
                  <span className="px-2 py-1 rounded bg-zinc-900 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-2">
                    <BellRing className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                    <span>
                      {waitingDaysInfo.isOverdue
                        ? `Sollecito scaduto (${waitingDaysInfo.label})`
                        : `In attesa ${waitingDaysInfo.label}`}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
                  {intervention.lastActionDate && (
                    <span className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      <span>
                        Richiesto il: <strong className="font-semibold text-zinc-200">{intervention.lastActionDate}</strong>
                      </span>
                    </span>
                  )}
                  {intervention.followUpChannel && (
                    <span className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      <span>
                        Tramite: <strong className="font-semibold text-zinc-200">{getChannelBadgeInfo(intervention.followUpChannel).short}</strong>
                      </span>
                    </span>
                  )}
                  {intervention.followUpDueDate && (
                    <span className="flex items-center gap-2 font-semibold text-zinc-200">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      <span>Scadenza sollecito: {intervention.followUpDueDate}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <a
                  href={getReminderWhatsAppUri(intervention, activeWaitingFrom, waitingDaysInfo.daysWaiting)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 text-xs font-normal transition"
                  title={`Invia sollecito WhatsApp a ${activeWaitingFrom}`}
                >
                  <MessageCircle className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  <span>Sollecita WhatsApp</span>
                </a>
                <a
                  href={getReminderMailtoUri(intervention, activeWaitingFrom, waitingDaysInfo.daysWaiting)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 text-xs font-normal transition"
                  title={`Prepara email di sollecito per ${activeWaitingFrom}`}
                >
                  <Mail className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  <span>Sollecita email</span>
                </a>
                {onMarkReplyReceived && (
                  <button
                    type="button"
                    onClick={() => onMarkReplyReceived(intervention.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition"
                    title="Segna che la risposta attesa è arrivata"
                  >
                    <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                    <span>Risposta ricevuta</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Diario Tracking Progetto */}
        {(isProjectWork || trackingLogs.length > 0 || intervention.whatIDidSummary) && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <ClipboardList className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
                <span>
                  Registro attività, comunicazioni e risposte ·{' '}
                  <span className="font-mono imp-tabular">{trackingLogs.length}</span>
                </span>
              </div>
              {onAddTrackingEntry && (
                <button
                  type="button"
                  onClick={() => setShowAddTrackingForm((prev) => !prev)}
                  className="w-full sm:w-auto justify-center text-xs font-semibold px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  <span>{showAddTrackingForm ? 'Chiudi modulo' : 'Registra attività o follow-up'}</span>
                </button>
              )}
            </div>

            {(intervention.whatIDidSummary || intervention.nextActionToDo) && (
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-2">
                {intervention.whatIDidSummary && (
                  <div className="text-zinc-200 flex items-start gap-2">
                    <Wrench className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                    <div>
                      <span className="font-semibold text-zinc-100">Ultima azione eseguita: </span>
                      <span>{intervention.whatIDidSummary}</span>
                    </div>
                  </div>
                )}
                {intervention.nextActionToDo && (
                  <div className="text-zinc-300 flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400" strokeWidth={1.75} />
                    <span>
                      <strong className="font-semibold text-zinc-100">Prossima azione:</strong> {intervention.nextActionToDo}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Add Tracking Entry Form */}
            {showAddTrackingForm && onAddTrackingEntry && (
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-700 space-y-4">
                <div className="text-xs font-semibold text-zinc-100">
                  Nuova voce di registro (attività, canale, data e risposta attesa)
                </div>

                <div>
                  <label className="block text-xs font-normal text-zinc-400 mb-2">Cosa ho fatto *</label>
                  <textarea
                    rows={2}
                    value={trkWhatIDid}
                    onChange={(e) => setTrkWhatIDid(e.target.value)}
                    placeholder="Descrivi l'attività svolta..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-normal text-zinc-400 mb-2">Canale comunicazione</label>
                    <select
                      value={trkChannel}
                      onChange={(e) => setTrkChannel(e.target.value as FollowUpChannel)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                    >
                      <option value="email">Seguito per email</option>
                      <option value="whatsapp">Seguito su WhatsApp</option>
                      <option value="phone">Seguito per telefono</option>
                      <option value="on_site">Eseguito in cantiere</option>
                      <option value="meeting">Riunione tecnica</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-normal text-zinc-400 mb-2">Data</label>
                    <input
                      type="date"
                      value={trkDate}
                      onChange={(e) => setTrkDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-normal text-zinc-400 mb-2">
                      <Hourglass className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      <span>Da chi aspetto risposta (opzionale)</span>
                    </label>
                    <input
                      type="text"
                      value={trkWaitingFrom}
                      onChange={(e) => setTrkWaitingFrom(e.target.value)}
                      placeholder="Es. Mario Rossi, Ing. Bianchi, Fornitore..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-normal text-zinc-400 mb-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      <span>Data entro cui sollecitare (opzionale)</span>
                    </label>
                    <input
                      type="date"
                      value={trkDueDate}
                      onChange={(e) => setTrkDueDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-normal text-zinc-400 mb-2">
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      <span>Prossima azione da fare (opzionale)</span>
                    </label>
                    <input
                      type="text"
                      value={trkNextStep}
                      onChange={(e) => setTrkNextStep(e.target.value)}
                      placeholder="Es. Collaudo in campo dopo conferma..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-normal text-zinc-400 mb-2">
                      <Paperclip className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                      <span>Riferimento documento o schema (opzionale)</span>
                    </label>
                    <input
                      type="text"
                      value={trkRefDoc}
                      onChange={(e) => setTrkRefDoc(e.target.value)}
                      placeholder="Es. Schema_QG.pdf, Preventivo #12..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTrackingForm(false)}
                    className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-100 bg-zinc-950 border border-zinc-800"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!trkWhatIDid.trim()) {
                        alert('Inserisci cosa hai fatto prima di salvare.');
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
                    className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition"
                  >
                    Salva nel registro
                  </button>
                </div>
              </div>
            )}

            {/* Tracking Entries List */}
            {trackingLogs.length === 0 ? (
              <p className="text-xs text-zinc-400">
                Nessun movimento registrato. Premi "Registra attività o follow-up" per tracciare email, WhatsApp e risposte attese.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                {trackingLogs.map((log) => {
                  const chInfo = getChannelBadgeInfo(log.channel);
                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono imp-tabular text-xs font-semibold px-2 py-1 rounded bg-zinc-950 text-zinc-200 border border-zinc-800 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                            <span>
                              {log.date}
                              {log.time ? ` ${log.time}` : ''}
                            </span>
                          </span>
                          <span className="text-xs font-normal px-2 py-1 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 flex items-center gap-2">
                            {log.channel === 'email' && <Mail className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                            {log.channel === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                            {log.channel === 'phone' && <Phone className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                            {log.channel === 'on_site' && <Wrench className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                            {log.channel === 'meeting' && <User className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />}
                            <span>{chInfo.label}</span>
                          </span>
                          {log.referenceDoc && (
                            <span className="text-xs px-2 py-1 rounded bg-zinc-950 text-zinc-300 border border-zinc-800 flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                              <span>{log.referenceDoc}</span>
                            </span>
                          )}
                        </div>

                        {onDeleteTrackingEntry && (
                          <button
                            type="button"
                            onClick={() => onDeleteTrackingEntry(intervention.id, log.id)}
                            className="text-zinc-500 hover:text-zinc-200 p-2 transition"
                            title="Elimina voce di registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                        )}
                      </div>

                      <div className="text-zinc-100 leading-relaxed">
                        <strong className="font-semibold text-zinc-300">Cosa ho fatto: </strong>
                        <span>{log.whatIDid}</span>
                      </div>

                      {log.waitingReplyFrom && (
                        <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
                          <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-zinc-950 text-zinc-200 text-xs font-normal border border-zinc-800">
                            {log.replyReceived ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.75} />
                            ) : (
                              <Hourglass className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.75} />
                            )}
                            <span>
                              {log.replyReceived
                                ? `Risposta ricevuta da: ${log.waitingReplyFrom}${log.replyReceivedAt ? ` (${log.replyReceivedAt})` : ''}`
                                : `Aspetto risposta da: ${log.waitingReplyFrom}${log.followUpDueDate ? ` (entro ${log.followUpDueDate})` : ''}`}
                            </span>
                          </div>

                          {!log.replyReceived && onMarkReplyReceived && (
                            <button
                              type="button"
                              onClick={() => onMarkReplyReceived(intervention.id, log.id)}
                              className="text-xs font-semibold px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-950 flex items-center gap-2 transition"
                            >
                              <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                              <span>Segna risposta ricevuta</span>
                            </button>
                          )}
                        </div>
                      )}

                      {log.nextStep && (
                        <div className="text-xs text-zinc-300 flex items-center gap-2 pt-2">
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.75} />
                          <span>
                            <strong className="font-semibold text-zinc-100">Prossimo passo:</strong> {log.nextStep}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Checklist Azioni da Fare sul Progetto */}
        {(isProjectWork || actionSteps.length > 0) && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <CheckSquare className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                <span>
                  Azioni da fare sul progetto ·{' '}
                  <span className="font-mono imp-tabular">
                    {completedStepsCount}/{actionSteps.length}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {actionSteps.length > 0 && (
                  <span className="text-xs font-mono imp-tabular font-semibold text-zinc-300">
                    {stepsProgressPct}% completato
                  </span>
                )}
                {onAddActionStep && (
                  <button
                    type="button"
                    onClick={() => setShowAddStepInput((prev) => !prev)}
                    className="text-xs font-semibold px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-2 transition"
                    title="Aggiungi una nuova azione da fare su questo lavoro"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Aggiungi azione</span>
                  </button>
                )}
              </div>
            </div>

            {actionSteps.length > 0 && (
              <div className="w-full h-2 bg-zinc-900 rounded overflow-hidden">
                <div
                  className="h-full bg-zinc-300 transition-all duration-300"
                  style={{ width: `${stepsProgressPct}%` }}
                />
              </div>
            )}

            {showAddStepInput && onAddActionStep && (
              <div className="flex items-center gap-2 pt-2">
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
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (quickStepText.trim()) {
                      onAddActionStep(intervention.id, quickStepText.trim());
                      setQuickStepText('');
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition"
                >
                  Salva
                </button>
              </div>
            )}

            {actionSteps.length === 0 ? (
              <p className="text-xs text-zinc-400">
                Nessuna sotto-azione inserita. Clicca "Aggiungi azione" per inserire i passaggi operativi.
              </p>
            ) : (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-2">
                {actionSteps.map((step) => (
                  <div
                    key={step.id}
                    onClick={() => onToggleActionStep && onToggleActionStep(intervention.id, step.id)}
                    className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                      step.completed
                        ? 'bg-zinc-900/50 border-zinc-800 text-zinc-500 line-through'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-100'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {step.completed ? (
                        <CheckSquare className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" strokeWidth={1.75} />
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
                        className="text-zinc-500 hover:text-zinc-200 p-2 rounded transition shrink-0"
                        title="Elimina azione"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inbound Email Source & Follow-up History */}
        {(intervention.emailSource || (intervention.emailHistory && intervention.emailHistory.length > 0)) && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4 text-xs space-y-2">
            <div className="flex items-center justify-between text-zinc-200 font-semibold flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                <span>Integrazione email in ingresso</span>
              </div>
              {intervention.emailSource && (
                <span className="text-xs text-zinc-300 font-mono imp-tabular bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                  Data: {intervention.emailSource.receivedAt}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex-wrap">
              <div className="flex items-center gap-2 text-zinc-200">
                <FolderKanban className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.75} />
                <span className="text-zinc-400 font-normal">Registrato su progetto:</span>
                <strong className="text-zinc-100 font-semibold">
                  {intervention.projectName || intervention.emailSource?.projectName || 'Workbank'}
                </strong>
              </div>
              {intervention.siteName && (
                <span className="text-xs text-zinc-400 truncate">Impianto: {intervention.siteName}</span>
              )}
            </div>

            {intervention.emailSource && (
              <div className="text-xs text-zinc-300">
                <span className="text-zinc-400 font-normal">Mittente: </span>
                <strong className="text-zinc-100 font-semibold">{intervention.emailSource.sender}</strong>
                {intervention.emailSource.subject && (
                  <div className="text-zinc-400 truncate mt-2">"{intervention.emailSource.subject}"</div>
                )}
              </div>
            )}

            {intervention.emailHistory && intervention.emailHistory.length > 0 && (
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <div className="text-xs font-semibold text-zinc-300">
                  Storico email e follow-up ({intervention.emailHistory.length})
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                  {intervention.emailHistory.map((item) => (
                    <div key={item.id} className="bg-zinc-900 p-2 rounded-lg border border-zinc-800 text-xs space-y-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400 flex-wrap gap-2">
                        <span className="font-semibold text-zinc-200">{item.sender}</span>
                        <span className="font-mono imp-tabular text-zinc-400">{item.receivedAt}</span>
                      </div>
                      <div className="text-zinc-200">{item.message}</div>
                      <div className="pt-2 border-t border-zinc-800 flex items-center gap-2 text-xs text-zinc-400 font-normal">
                        <FolderKanban className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.75} />
                        <span>
                          Progetto registrato:{' '}
                          <strong className="text-zinc-100 font-semibold">
                            {item.projectName || intervention.projectName || 'Generale'}
                          </strong>
                        </span>
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
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-2">
              <ImageIcon className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span>Immagini allegate ({intervention.defectPhotos.length}):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {intervention.defectPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => onPreviewPhoto(photo)}
                  className="relative group cursor-pointer w-16 h-16 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 shrink-0 transition"
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <span className="text-xs text-zinc-100 font-semibold">Apri</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report Execution Photos Thumbnails */}
        {intervention.report?.reportPhotos && intervention.report.reportPhotos.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-2">
              <Camera className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span>Foto lavoro eseguito ({intervention.report.reportPhotos.length}):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {intervention.report.reportPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => onPreviewPhoto(photo)}
                  className="relative group cursor-pointer w-16 h-16 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 shrink-0 transition"
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <span className="text-xs text-zinc-100 font-semibold">Apri</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting for Parts Interim Report Section */}
        {!isCompleted && isWaitingForParts && intervention.report && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Clock className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                <span>In lavorazione — Attesa ricambi (Tecnico: {intervention.report.technicianName})</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 font-mono imp-tabular">
                <Clock className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span>{intervention.report.hoursWorked} ore registrate</span>
              </div>
            </div>

            <div className="text-xs text-zinc-200">
              <strong className="font-semibold text-zinc-100">Lavoro svolto: </strong>
              {intervention.report.workDone}
            </div>

            {intervention.report.materialsUsed && (
              <div className="text-xs text-zinc-300">
                <strong className="font-semibold text-zinc-100">Ricambi richiesti / Materiali: </strong>
                {intervention.report.materialsUsed}
              </div>
            )}

            {intervention.report.technicalNotes && (
              <div className="text-xs text-zinc-300">
                <strong className="font-semibold text-zinc-100">Note tecniche: </strong>
                {intervention.report.technicalNotes}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleDownloadPDF(intervention)}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 transition"
                >
                  <FileDown className="w-4 h-4" strokeWidth={1.75} />
                  <span>Scarica report parziale</span>
                </button>
                <button
                  onClick={() => handleSharePDF(intervention)}
                  className="flex items-center gap-2 text-xs font-normal px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 transition"
                  title="Condividi report parziale su WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  <span>Invia su WhatsApp</span>
                </button>
              </div>

              <span className="text-xs text-zinc-400 font-mono imp-tabular">
                Registrato: {intervention.report.interventionDate}
              </span>
            </div>
          </div>
        )}

        {/* Technician Report Section (If Completed) */}
        {isCompleted && intervention.report && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <CheckCircle2 className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                <span>Intervento completato da {intervention.report.technicianName}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 font-mono imp-tabular">
                <Clock className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
                <span>{intervention.report.hoursWorked} ore lavorate</span>
              </div>
            </div>

            <div className="text-xs text-zinc-200">
              <strong className="font-semibold text-zinc-100">Lavoro eseguito: </strong>
              {intervention.report.workDone}
            </div>

            {intervention.report.materialsUsed && (
              <div className="text-xs text-zinc-300">
                <strong className="font-semibold text-zinc-100">Materiali utilizzati: </strong>
                {intervention.report.materialsUsed}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleDownloadPDF(intervention)}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 transition"
                >
                  <FileDown className="w-4 h-4" strokeWidth={1.75} />
                  <span>Scarica report PDF</span>
                </button>
                <button
                  onClick={() => handleSharePDF(intervention)}
                  className="flex items-center gap-2 text-xs font-normal px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 transition"
                  title="Condividi report PDF su WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                  <span>Invia su WhatsApp</span>
                </button>
              </div>

              <span className="text-xs text-zinc-400 font-mono imp-tabular">
                Data: {intervention.report.interventionDate}
              </span>
            </div>
          </div>
        )}

        {/* Client Feedback Section */}
        {intervention.clientFeedback && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <MessageSquare className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
                <span>Accettazione cliente: {intervention.clientFeedback.clientName}</span>
              </div>
              {intervention.clientFeedback.rating && (
                <div className="flex items-center gap-1">
                  {[...Array(intervention.clientFeedback.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-zinc-300" strokeWidth={1.75} />
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-300">"{intervention.clientFeedback.notes}"</p>

            <div className="text-xs text-zinc-500 text-right font-mono imp-tabular">
              Ricevuto il {new Date(intervention.clientFeedback.submittedAt).toLocaleDateString('it-IT')}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Left side: assigned technician info */}
        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <Shield className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
          <span className="truncate">
            {intervention.assignedTechnician
              ? `Assegnato a ${intervention.assignedTechnician}`
              : 'Nessun tecnico assegnato'}
          </span>
        </div>

        {/* Right side contextual buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-stretch sm:justify-end">
          {isWaiting && isTechOrAdmin && (
            <button
              onClick={() => onTakeCharge(intervention.id, currentUserName)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-zinc-100 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition"
            >
              <Wrench className="w-4 h-4" strokeWidth={1.75} />
              <span>Prendi in carico</span>
            </button>
          )}

          {isTechOrAdmin && (
            <button
              onClick={() => onOpenReportModal(intervention)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                isCompleted
                  ? 'bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-800'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-950'
              }`}
            >
              <Wrench className="w-4 h-4" strokeWidth={1.75} />
              <span>
                {isCompleted
                  ? 'Modifica report'
                  : isWaitingForParts
                    ? 'Aggiorna ricambi o completa'
                    : 'Esegui e completa'}
              </span>
            </button>
          )}

          {isCompleted && (
            <button
              onClick={() => onOpenFeedbackModal(intervention)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-normal bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition"
            >
              <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
              <span>{intervention.clientFeedback ? 'Aggiorna firma' : 'Firma e feedback'}</span>
            </button>
          )}

          {isCompleted && (
            <button
              onClick={() => handleDownloadPDF(intervention)}
              className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition"
              title="Scarica PDF"
            >
              <FileDown className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
