import React, { useState } from 'react';
import { X, MessageSquare, Star, CheckCircle, AlertCircle, FileDown, ThumbsUp } from 'lucide-react';
import { InterventionRequest, ClientFeedback } from '../types';
import { downloadInterventionPDF } from '../lib/pdfGenerator';

interface ClientFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervention: InterventionRequest | null;
  onSaveFeedback: (interventionId: string, feedback: ClientFeedback) => void;
  currentClientName: string;
}

export const ClientFeedbackModal: React.FC<ClientFeedbackModalProps> = ({
  isOpen,
  onClose,
  intervention,
  onSaveFeedback,
  currentClientName,
}) => {
  if (!isOpen || !intervention) return null;

  const existingFeedback = intervention.clientFeedback;

  const [clientName, setClientName] = useState(
    existingFeedback?.clientName || currentClientName || intervention.clientName
  );
  const [feedbackStatus, setFeedbackStatus] = useState<'approvato' | 'richiesta_revisione' | 'contestato'>(
    existingFeedback?.feedbackStatus || 'approvato'
  );
  const [rating, setRating] = useState<number>(existingFeedback?.rating || 5);
  const [notes, setNotes] = useState(existingFeedback?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      alert('Per favore inserisci un breve commento o riscontro sull\'intervento eseguito.');
      return;
    }

    const feedback: ClientFeedback = {
      clientName: clientName.trim(),
      submittedAt: new Date().toISOString(),
      feedbackStatus,
      rating,
      notes: notes.trim()
    };

    onSaveFeedback(intervention.id, feedback);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Riscontro & Risposta del Richiedente</h3>
              <p className="text-xs text-slate-400">Valuta il lavoro svolto dal tecnico e conferma l'esito</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technician Work Summary & PDF Download */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">Lavoro Eseguito da: </span>
              {intervention.report?.technicianName || intervention.assignedTechnician || 'Tecnico On-Site'} (
              {intervention.report?.hoursWorked} ore lavorate)
            </div>
            <button
              type="button"
              onClick={() => downloadInterventionPDF(intervention)}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Scarica Rapporto PDF</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            {intervention.report?.workDone || 'Intervento di ripristino completato.'}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Nome Referente */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome del Referente che rilascia la risposta <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Stato Esito Accettazione */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Stato Riscontro / Accettazione Intervento <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFeedbackStatus('approvato')}
                className={`p-2.5 rounded-lg text-xs font-semibold border transition text-center flex flex-col items-center gap-1 ${
                  feedbackStatus === 'approvato'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Intervento Approvato</span>
              </button>

              <button
                type="button"
                onClick={() => setFeedbackStatus('richiesta_revisione')}
                className={`p-2.5 rounded-lg text-xs font-semibold border transition text-center flex flex-col items-center gap-1 ${
                  feedbackStatus === 'richiesta_revisione'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>Chiarimento / Verifica</span>
              </button>

              <button
                type="button"
                onClick={() => setFeedbackStatus('contestato')}
                className={`p-2.5 rounded-lg text-xs font-semibold border transition text-center flex flex-col items-center gap-1 ${
                  feedbackStatus === 'contestato'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
                <span>Non Risolto</span>
              </button>
            </div>
          </div>

          {/* Valutazione a Stelle */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Valutazione Soddisfazione Lavoro
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 text-slate-600 hover:scale-110 transition"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs text-slate-400 ml-2">
                {rating === 5 && 'Eccellente'}
                {rating === 4 && 'Molto Buono'}
                {rating === 3 && 'Sufficiente'}
                {rating === 2 && 'Migliorabile'}
                {rating === 1 && 'Scarso'}
              </span>
            </div>
          </div>

          {/* Commento / Risposta del Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Commento e Note a Seguito dell'Intervento <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="es. Macchinario riavviato e collaudato con successo. Nessun problema rilevato..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/25 active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Invia Riscontro Intervento</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
