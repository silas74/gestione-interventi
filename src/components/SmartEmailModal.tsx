import React, { useState, useEffect } from 'react';
import { 
  X, Mail, Sparkles, CheckCircle2, AlertCircle, Clock, 
  ArrowRight, Shield, FolderKanban, Tag, Send, RefreshCw, FileText
} from 'lucide-react';
import { InterventionRequest, Project, InterventionPriority } from '../types';
import { parseInboundEmail, ParsedEmailResult, SAMPLE_EMAILS, EmailActionType } from '../lib/emailParser';

interface SmartEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  interventions: InterventionRequest[];
  projects: Project[];
  onExecuteEmailAction: (result: {
    action: EmailActionType;
    sender: string;
    receivedAt: string;
    subject: string;
    message: string;
    targetInterventionId?: string;
    newTicket?: {
      title: string;
      description: string;
      projectId?: string;
      projectName?: string;
      priority: InterventionPriority;
    };
  }) => void;
}

export const SmartEmailModal: React.FC<SmartEmailModalProps> = ({
  isOpen,
  onClose,
  interventions,
  projects,
  onExecuteEmailAction
}) => {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedEmailResult | null>(null);

  // Editable fields once parsed
  const [selectedAction, setSelectedAction] = useState<EmailActionType>('create');
  const [sender, setSender] = useState('');
  const [receivedAt, setReceivedAt] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyMessage, setBodyMessage] = useState('');
  const [targetInterventionId, setTargetInterventionId] = useState<string>('');
  const [newTitle, setNewTitle] = useState('');
  const [newProjectId, setNewProjectId] = useState<string>('');
  const [newPriority, setNewPriority] = useState<InterventionPriority>('medium');

  // Parse whenever rawText changes or on button click
  const runParser = (textToParse: string) => {
    const result = parseInboundEmail(textToParse, interventions, projects);
    setParsed(result);
    setSelectedAction(result.action);
    setSender(result.sender);
    setReceivedAt(result.receivedAt);
    setSubject(result.subject);
    setBodyMessage(result.cleanBody);
    setTargetInterventionId(result.matchedInterventionId || (interventions[0]?.id || ''));
    setNewTitle(result.suggestedTitle);
    setNewProjectId(result.matchedProjectId || (projects[0]?.id || ''));
    setNewPriority(result.priority as InterventionPriority);
  };

  const handleLoadSample = (sampleKey: keyof typeof SAMPLE_EMAILS) => {
    const sample = SAMPLE_EMAILS[sampleKey];
    setRawText(sample);
    runParser(sample);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    if (text.trim().length > 10) {
      runParser(text);
    } else {
      setParsed(null);
    }
  };

  const handleConfirmAction = () => {
    if (!sender.trim()) {
      alert('Specificare il mittente dell\'email.');
      return;
    }

    if (selectedAction === 'create') {
      if (!newTitle.trim()) {
        alert('Specificare un titolo per il nuovo intervento.');
        return;
      }
      const chosenProj = projects.find(p => p.id === newProjectId) || projects[0];
      onExecuteEmailAction({
        action: 'create',
        sender,
        receivedAt,
        subject,
        message: bodyMessage,
        newTicket: {
          title: newTitle,
          description: bodyMessage,
          projectId: newProjectId,
          projectName: chosenProj?.name,
          priority: newPriority
        }
      });
    } else {
      if (!targetInterventionId) {
        alert('Selezionare l\'intervento di riferimento per il follow-up o la chiusura.');
        return;
      }
      onExecuteEmailAction({
        action: selectedAction,
        sender,
        receivedAt,
        subject,
        message: bodyMessage,
        targetInterventionId
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  const matchedIntervention = interventions.find(i => i.id === targetInterventionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Smart Inbound Email Assistant</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Antigravity AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Incolla un'email: crea nuovi ticket, registra follow-up ricambi o chiudi automaticamente gli interventi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Quick Demo Templates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Prova con un'email di esempio:
              </label>
              <span className="text-[11px] text-slate-500">1-clic per testare la logica</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleLoadSample('urgentNew')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-rose-800/60 bg-rose-950/25 hover:bg-rose-900/40 text-left transition active:scale-95"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0"></div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-rose-300">1. Nuovo Guasto</div>
                  <div className="text-[10px] text-rose-300/70 truncate">Quadro elettrico (Urgente)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('followUpParts')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-pink-700/60 bg-pink-950/25 hover:bg-pink-900/40 text-left transition active:scale-95"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0"></div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-pink-300">2. Follow-up Ricambi</div>
                  <div className="text-[10px] text-pink-300/70 truncate">Ricambi arrivati da fornitore</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('closeResolved')}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-800/60 bg-emerald-950/25 hover:bg-emerald-900/40 text-left transition active:scale-95"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-300">3. Conferma Chiusura</div>
                  <div className="text-[10px] text-emerald-300/70 truncate">Problema risolto dal cliente</div>
                </div>
              </button>
            </div>
          </div>

          {/* Email Raw Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Testo dell'Email ricevuta (Incolla qui):</span>
              </label>
              {rawText && (
                <button
                  type="button"
                  onClick={() => {
                    setRawText('');
                    setParsed(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-300 transition"
                >
                  Svuota testo
                </button>
              )}
            </div>
            <textarea
              rows={5}
              value={rawText}
              onChange={handleTextChange}
              placeholder="Incolla l'email (es. Da: mario@azienda.it, Data: 26/09/2026, Oggetto: Guasto pompa...)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono leading-relaxed"
            />
          </div>

          {/* Parsed Results & Action Plan */}
          {parsed && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
              
              {/* Classification Intent Banner */}
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                selectedAction === 'close'
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                  : selectedAction === 'follow_up'
                    ? 'bg-pink-950/30 border-pink-700/60 text-pink-200'
                    : 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              }`}>
                <div className="mt-0.5 shrink-0">
                  {selectedAction === 'close' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {selectedAction === 'follow_up' && <Clock className="w-5 h-5 text-pink-400" />}
                  {selectedAction === 'create' && <AlertCircle className="w-5 h-5 text-rose-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Azione Intelligente Rilevata:
                    </span>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                      selectedAction === 'close'
                        ? 'bg-emerald-500 text-slate-950'
                        : selectedAction === 'follow_up'
                          ? 'bg-pink-600 text-white'
                          : 'bg-rose-600 text-white'
                    }`}>
                      {selectedAction === 'close' && '🟢 CHIUDI & SEGNA RISOLTO'}
                      {selectedAction === 'follow_up' && '🌸 AGGIORNA / FOLLOW-UP'}
                      {selectedAction === 'create' && '🔴 CREA NUOVO TICKET (TO DO)'}
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {parsed.actionReason}
                  </p>
                  {parsed.matchedProjectName && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center gap-1.5 text-xs text-blue-200">
                      <FolderKanban className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Progetto Rilevato: </span>
                      <strong className="text-white bg-blue-900/60 px-2 py-0.5 rounded border border-blue-600/50">
                        {parsed.matchedProjectName}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Selector (User can override) */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Conferma o cambia l'azione desiderata:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAction('create')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition ${
                      selectedAction === 'create'
                        ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-950/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🔴 Nuovo Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAction('follow_up')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition ${
                      selectedAction === 'follow_up'
                        ? 'bg-pink-600 text-white border-pink-400 shadow-md shadow-pink-950/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🌸 Follow-up / Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAction('close')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition ${
                      selectedAction === 'close'
                        ? 'bg-emerald-600 text-slate-950 font-black border-emerald-400 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🟢 Chiudi / Risolto
                  </button>
                </div>
              </div>

              {/* Sender & Timestamp Metadata Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    👤 Mittente Rilevato (Da chi):
                  </label>
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Nome o email del mittente"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    📅 Data & Ora Ricezione Email:
                  </label>
                  <input
                    type="text"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    placeholder="YYYY-MM-DD HH:mm"
                  />
                </div>
              </div>

              {/* Dynamic Action Fields */}
              {selectedAction === 'create' ? (
                /* Fields for Creating New Ticket */
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Configurazione Nuovo Intervento</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Titolo Intervento:
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="es. Guasto quadro elettrico reparto macchine"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-blue-300 block mb-1 flex items-center gap-1.5">
                        <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                        <span>Progetto di Registrazione:</span>
                      </label>
                      <select
                        value={newProjectId}
                        onChange={(e) => setNewProjectId(e.target.value)}
                        className="w-full bg-slate-900 border border-blue-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                      >
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>
                            📁 {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                      {projects.find(p => p.id === newProjectId) && (
                        <div className="mt-1 text-[10px] text-blue-300/90 font-medium">
                          Verrà registrato sotto il progetto: <strong className="text-white">{projects.find(p => p.id === newProjectId)?.name}</strong>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Priorità Rilevata:
                      </label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as InterventionPriority)}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-bold border focus:outline-none ${
                          newPriority === 'urgent'
                            ? 'bg-rose-950 text-rose-200 border-rose-600 ring-1 ring-rose-500'
                            : 'bg-slate-900 text-white border-slate-700'
                        }`}
                      >
                        <option value="urgent">🚨 Urgente (Intervento Immediato)</option>
                        <option value="high">Alta Priorità</option>
                        <option value="medium">Media Priorità</option>
                        <option value="low">Bassa Priorità</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* Fields for Updating or Closing an Existing Ticket */
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FolderKanban className="w-4 h-4 text-blue-400" />
                      <span>Intervento di Destinazione:</span>
                    </span>
                    {matchedIntervention && (
                      <span className="text-[11px] text-blue-400 font-mono">
                        Match ID: {matchedIntervention.code}
                      </span>
                    )}
                  </div>

                  <select
                    value={targetInterventionId}
                    onChange={(e) => setTargetInterventionId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {interventions.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.code}] {item.title} — Progetto: {item.projectName || item.siteName} ({item.status})
                      </option>
                    ))}
                  </select>

                  {matchedIntervention && (
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                      <div className="font-semibold text-white">{matchedIntervention.title}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-blue-300 font-bold bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/50">
                          <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
                          <span>Progetto: {matchedIntervention.projectName || 'Generale'}</span>
                        </span>
                        <span>•</span>
                        <span>Cliente: <strong className="text-slate-200">{matchedIntervention.clientName}</strong></span>
                        <span>•</span>
                        <span>Stato: <strong className="text-slate-200">{matchedIntervention.status}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Message / Follow-up Body */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  {selectedAction === 'create'
                    ? 'Descrizione Dettaglio Guasto (Estratta dal corpo):'
                    : selectedAction === 'follow_up'
                      ? 'Nota di Follow-up da registrare sul ticket:'
                      : 'Nota di chiusura da annotare sul rapporto:'}
                </label>
                <textarea
                  rows={3}
                  value={bodyMessage}
                  onChange={(e) => setBodyMessage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Note estratte dall'email..."
                />
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Annulla
          </button>

          <button
            type="button"
            disabled={!parsed}
            onClick={handleConfirmAction}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg active:scale-95 ${
              !parsed
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : selectedAction === 'close'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black shadow-emerald-950/40'
                  : selectedAction === 'follow_up'
                    ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-950/40'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>
              {selectedAction === 'close' && 'Conferma e Chiudi Intervento'}
              {selectedAction === 'follow_up' && 'Registra Follow-up / Aggiorna'}
              {selectedAction === 'create' && 'Crea Nuovo Intervento (TO DO)'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
