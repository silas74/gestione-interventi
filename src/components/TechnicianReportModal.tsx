import React, { useState } from 'react';
import { X, CheckCircle2, Clock, Wrench, FileDown, AlertCircle, Sparkles } from 'lucide-react';
import { InterventionRequest, TechnicianReport } from '../types';
import { downloadInterventionPDF, getInterventionPDFDataUri } from '../lib/pdfGenerator';

interface TechnicianReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  intervention: InterventionRequest | null;
  onSaveReport: (interventionId: string, report: TechnicianReport) => void;
  currentTechnicianName: string;
}

export const TechnicianReportModal: React.FC<TechnicianReportModalProps> = ({
  isOpen,
  onClose,
  intervention,
  onSaveReport,
  currentTechnicianName,
}) => {
  if (!isOpen || !intervention) return null;

  const existingReport = intervention.report;

  const [technicianName, setTechnicianName] = useState(
    existingReport?.technicianName || currentTechnicianName || 'Costantino'
  );
  const [interventionDate, setInterventionDate] = useState(
    existingReport?.interventionDate || new Date().toISOString().split('T')[0]
  );
  const [hoursWorked, setHoursWorked] = useState<number>(
    existingReport?.hoursWorked ?? 2
  );
  const [workDone, setWorkDone] = useState(
    existingReport?.workDone || ''
  );
  const [materialsUsed, setMaterialsUsed] = useState(
    existingReport?.materialsUsed || ''
  );
  const [technicalNotes, setTechnicalNotes] = useState(
    existingReport?.technicalNotes || ''
  );
  const [statusOutcome, setStatusOutcome] = useState<'risolto' | 'parziale' | 'in_attesa_ricambi'>(
    existingReport?.statusOutcome || 'risolto'
  );

  const handlePreviewPDF = () => {
    // Build temporary intervention object with updated report to generate PDF
    const tempReport: TechnicianReport = {
      technicianName,
      interventionDate,
      hoursWorked: Number(hoursWorked),
      workDone: workDone.trim() || 'Verifica e manutenzione completata a regola d\'arte.',
      materialsUsed: materialsUsed.trim(),
      technicalNotes: technicalNotes.trim(),
      statusOutcome,
      completedAt: new Date().toISOString(),
    };

    const tempIntervention: InterventionRequest = {
      ...intervention,
      status: 'completato',
      assignedTechnician: technicianName,
      report: tempReport
    };

    downloadInterventionPDF(tempIntervention);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!workDone.trim()) {
      alert('Per favore inserisci la descrizione dei lavori eseguiti sul posto.');
      return;
    }

    const report: TechnicianReport = {
      technicianName,
      interventionDate,
      hoursWorked: Number(hoursWorked),
      workDone: workDone.trim(),
      materialsUsed: materialsUsed.trim(),
      technicalNotes: technicalNotes.trim(),
      statusOutcome,
      completedAt: new Date().toISOString(),
    };

    // Also attach PDF Data URI
    try {
      const tempIntervention: InterventionRequest = {
        ...intervention,
        status: 'completato',
        assignedTechnician: technicianName,
        report
      };
      report.pdfDataUri = getInterventionPDFDataUri(tempIntervention);
    } catch (err) {
      console.warn('PDF data URI generation skipped', err);
    }

    onSaveReport(intervention.id, report);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Rapporto Tecnico di Intervento</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 border border-blue-700/50">
                  {intervention.code}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Sede: {intervention.siteName} — Cliente: {intervention.clientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Problem Reminder Callout */}
        <div className="bg-slate-950/80 px-6 py-2.5 border-b border-slate-800 flex items-start gap-2 text-xs text-slate-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Problema Segnalato: </span>
            <span>{intervention.title} — {intervention.description}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Tecnico, Data & Ore Lavorate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tecnico Esecutore <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data Esecuzione Intervento <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={interventionDate}
                onChange={(e) => setInterventionDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Ore Lavorate Sul Posto <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                required
                value={hoursWorked}
                onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Lavori Svolti / Cosa è stato fatto */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Descrizione Dettagliata Lavori Eseguiti <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={workDone}
              onChange={(e) => setWorkDone(e.target.value)}
              placeholder="Indica con precisione cosa è stato fatto: smontaggio componenti, riparazione, test effettuati, tarature, regolazioni..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Ricambi e Materiali Usati */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ricambi e Materiali Impiegati (opzionale)
            </label>
            <input
              type="text"
              value={materialsUsed}
              onChange={(e) => setMaterialsUsed(e.target.value)}
              placeholder="es. 1x Scheda relè 24V, 2x Filtri aria, 5mt cavo schermato..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Note Tecniche / Raccomandazioni */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Note Tecniche & Raccomandazioni per il Cliente
            </label>
            <textarea
              rows={2}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="es. Verificato ciclo termico OK. Si consiglia controllo livello olio tra 2 settimane..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Esito Intervento */}
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Esito Finale Intervento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatusOutcome('risolto')}
                className={`p-2 rounded-lg text-xs font-semibold border transition text-center ${
                  statusOutcome === 'risolto'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Risolto con Successo
              </button>
              <button
                type="button"
                onClick={() => setStatusOutcome('parziale')}
                className={`p-2 rounded-lg text-xs font-semibold border transition text-center ${
                  statusOutcome === 'parziale'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Funzionante / Parziale
              </button>
              <button
                type="button"
                onClick={() => setStatusOutcome('in_attesa_ricambi')}
                className={`p-2 rounded-lg text-xs font-semibold border transition text-center ${
                  statusOutcome === 'in_attesa_ricambi'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                In Attesa Ricambi
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handlePreviewPDF}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title="Genera e scarica il file PDF prima del salvataggio definitivo"
            >
              <FileDown className="w-4 h-4 text-blue-400" />
              <span>Scarica Anteprima PDF</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition text-center"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-[2] sm:flex-none flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/25 active:scale-95 text-center"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salva & Completa</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
